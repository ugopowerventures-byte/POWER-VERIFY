import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Award,
  Server,
  CheckCircle2,
  Users,
  Sparkles,
  Building,
  ArrowRight,
  Zap
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const { navigate } = useAuth();

  return (
    <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Title & Introduction */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-100/70 border border-orange-200 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span>About UGOPAWAVERIFY</span>
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-tight">
          Nigeria's Premier Identity & Registry Verification Infrastructure
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">
          UGOPAWAVERIFY was architected to empower individuals, businesses, fintech startups, and certified verification agents with secure, zero-friction verification against federal registries.
        </p>
      </div>

      {/* Featured Showcase Hero with Main Image */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-200/80 shadow-xl bg-[#121212] text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Narrative Column */}
          <div className="lg:col-span-6 p-8 sm:p-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>Dedicated Enterprise Operations</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
              Delivering Rapid, Compliant & Certified Registry Intelligence
            </h2>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              We bridge individuals and commercial institutions with direct verification gateways across NIN modifications, BVN services, NPC birth attestations, CAC corporate lookups, and TIN registrations.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-2xl font-black text-[#FF6B00] font-mono block">99.9%</span>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Gateway Uptime</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-2xl font-black text-amber-400 font-mono block">&lt; 2s</span>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Average Response</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-xs hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Image Column */}
          <div className="lg:col-span-6 p-4 sm:p-8 flex items-center justify-center">
            <div className="relative w-full max-w-lg aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
              <img
                src="/images/about-hero.jpg"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== 'https://i.ibb.co/BHnHcQBb/98889d82117a416eeb97c76803969bd5.jpg') {
                    target.src = 'https://i.ibb.co/BHnHcQBb/98889d82117a416eeb97c76803969bd5.jpg';
                  }
                }}
                alt="UGOPAWAVERIFY Identity Operations"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-xs text-white flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Live Operational Platform
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold">VERIFIED SECURE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lively Multi-Image Gallery Showcase */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Field Presence & Infrastructure
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
            Trusted by Thousands of Verification Agents
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Every day, agents and businesses across all 36 states count on UGOPAWAVERIFY for accurate results without delays.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1 with Second Image */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
              <img
                src="/images/about-desks.jpg"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== 'https://i.ibb.co/Nd3GZr6x/acce6bc04dc99554fe1ab794030aa8ab.jpg') {
                    target.src = 'https://i.ibb.co/Nd3GZr6x/acce6bc04dc99554fe1ab794030aa8ab.jpg';
                  }
                }}
                alt="Identity Verification Center Desk"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold border border-white/10 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-orange-400" />
                <span>Modern Verification Desks</span>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <h3 className="text-lg font-bold text-gray-900">
                Nationwide Verification & Enrollment Centers
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Our network supports real-time biometric enrollment, modifications, and swift data reconciliation. From BVN enrollment hub routing to immediate slip issuing, our infrastructure ensures high security and total compliance.
              </p>
            </div>
          </div>

          {/* Card 2 with Third Image */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
              <img
                src="/images/about-support.jpg"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== 'https://i.ibb.co/yc5W1287/674c036f1de2179682c00d279b88dbc1.jpg') {
                    target.src = 'https://i.ibb.co/yc5W1287/674c036f1de2179682c00d279b88dbc1.jpg';
                  }
                }}
                alt="Client Support & Onboarding Operations"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold border border-white/10 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Agent & User Support</span>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <h3 className="text-lg font-bold text-gray-900">
                Dedicated Specialist Support & Compliance
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Our support desk operates round the clock to resolve inquiries, assist with complex registry attestations, and ensure you always have prompt human assistance when processing essential customer documents.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="bg-white p-7 rounded-3xl border border-gray-200 space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Regulatory Adherence & NDPR Compliance</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            All identity lookups conducted through UGOPAWAVERIFY comply strictly with the Nigeria Data Protection Act (NDPA) and NDPR mandates. Identity records are accessed strictly for authorized KYC, employment screening, and lawful commercial purposes.
          </p>
        </div>

        <div className="bg-white p-7 rounded-3xl border border-gray-200 space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Cryptographic Integrity</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Every verification slip generated on the platform is cryptographically signed with a unique verification reference and scannable QR verification link. Tampering with any digital record invalidates its checksum.
          </p>
        </div>

        <div className="bg-white p-7 rounded-3xl border border-gray-200 space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">High-Availability API Architecture</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Engineered with intelligent fallback logic between accredited verification providers, reducing downtime and latency to ensure your verification tasks finish in under two seconds.
          </p>
        </div>

        <div className="bg-white p-7 rounded-3xl border border-gray-200 space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Zero Fabricated Results Guarantee</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            We adhere strictly to our core creed: zero fake data. If an official registry reports an unverified record or error, your wallet is safeguarded and immediately refunded.
          </p>
        </div>
      </div>

      {/* CTA Box */}
      <div className="bg-[#121212] text-white rounded-3xl p-8 sm:p-10 border border-[#252525] text-center space-y-4">
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Ready to experience seamless verification?
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
          Log in to your account or register today to start verifying identity records instantly.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-xs hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
          >
            Log In to Portal
          </button>
        </div>
      </div>
    </div>
  );
};
