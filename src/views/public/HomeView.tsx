import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { BrandLogo } from '../../components/common/BrandLogo';
import { Footer } from '../../components/common/Footer';
import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { navigate } = useAuth();
  const [stats, setStats] = useState<{
    totalUsers: string | number;
    verificationsCompleted: string | number;
    successRate: string;
    servicesAvailable: string | number;
  }>({
    totalUsers: '--',
    verificationsCompleted: '--',
    successRate: '--',
    servicesAvailable: '--'
  });

  useEffect(() => {
    async function loadData() {
      try {
        const statsData = await api.get('/stats/public');
        setStats(statsData || { totalUsers: '--', verificationsCompleted: '--', successRate: '--', servicesAvailable: '--' });
      } catch (err) {
        console.error('Failed to load stats data:', err);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-gray-900 selection:bg-orange-500 selection:text-black flex flex-col">
      {/* CLEAN PUBLIC TOP NAVBAR - NO HAMBURGER, NO NOTIFICATION BELL, NO WHATSAPP, NO BALANCE, NO FUND BUTTON */}
      <header className="sticky top-0 z-50 bg-[#121212]/95 backdrop-blur-md border-b border-[#2A2A2A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo - Static display */}
          <div className="flex items-center gap-2 select-none pointer-events-none">
            <BrandLogo size="md" showText={true} textClassName="text-white" />
          </div>

          {/* Public Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              id="public-nav-about-btn"
              onClick={() => navigate('/about')}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-gray-300 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              About Us
            </button>
            <button
              id="public-nav-login-btn"
              onClick={() => navigate('/login')}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs sm:text-sm hover:bg-white/15 transition-all cursor-pointer"
            >
              Login
            </button>
            <button
              id="public-nav-register-btn"
              onClick={() => navigate('/register')}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-xs sm:text-sm hover:brightness-110 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION WITH VIDEO-LIKE DYNAMIC BACKGROUND */}
      <section className="relative overflow-hidden bg-[#0A0A0A] text-white pt-24 pb-28 sm:pb-36 border-b border-[#252525] min-h-[580px] flex items-center justify-center">
        {/* Dynamic Video-Like Camera Background Layers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Layer A - Primary Hero Video Scene */}
          <img
            src="/images/hero-scene-a.jpg"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== 'https://i.ibb.co/9mCJfZ0q/d6a7f1b4e6768e178e4af5e1d9d41909.jpg') {
                target.src = 'https://i.ibb.co/9mCJfZ0q/d6a7f1b4e6768e178e4af5e1d9d41909.jpg';
              }
            }}
            alt="Active Identity Verification Scene"
            className="absolute inset-0 w-full h-full object-cover object-center animate-hero-video-a"
          />

          {/* Layer B - Secondary Hero Video Scene with seamless cinematic cut */}
          <img
            src="/images/hero-scene-b.jpg"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== 'https://i.ibb.co/hFBJvnM8/bbdf8bbb253ad7e925eb1733c5ea164d.jpg') {
                target.src = 'https://i.ibb.co/hFBJvnM8/bbdf8bbb253ad7e925eb1733c5ea164d.jpg';
              }
            }}
            alt="Biometric Terminal Verification Scene"
            className="absolute inset-0 w-full h-full object-cover object-center animate-hero-video-b"
          />

          {/* Dynamic Laser / Scanner Sweep Simulation */}
          <div className="absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-orange-500/20 to-transparent animate-scanner-sweep pointer-events-none" />

          {/* Video Contrast & Vignette Overlays for Maximum Legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-[#0A0A0A]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[360px] bg-gradient-to-tr from-[#FF6B00]/25 via-[#FFAA00]/20 to-transparent blur-[120px] rounded-full pointer-events-none animate-ambient-pulse" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Top compliance badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs font-semibold text-amber-400 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>Accredited Identity Verification Infrastructure</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white drop-shadow-md">
              Fast, Secure & <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#FF6B00] via-[#FF8A00] to-[#FFB800] bg-clip-text text-transparent">
                Reliable Verification
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow">
              Verify identity information through a secure digital verification platform designed for individuals, businesses and organizations. Instant registry lookups with cryptographic slips.
            </p>

            {/* CTA Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="hero-start-btn"
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-base hover:brightness-110 shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                id="hero-about-btn"
                onClick={() => navigate('/about')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-base backdrop-blur-sm transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
              >
                <span>About Us</span>
              </button>
            </div>

            {/* Micro security highlights */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Fake Results
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Double-Charge Protection
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Official PDF Slips with QR
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / DYNAMIC STATISTICS SECTION */}
      <section className="bg-white border-b border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-gray-100 text-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-gray-950 font-mono tracking-tight">
                {stats.totalUsers}
              </span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">
                Total Users
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-gray-100 text-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#FF6B00] font-mono tracking-tight">
                {stats.verificationsCompleted}
              </span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">
                Verifications Completed
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-gray-100 text-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 font-mono tracking-tight">
                {stats.successRate}
              </span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">
                Success Rate
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-gray-100 text-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-gray-950 font-mono tracking-tight">
                {stats.servicesAvailable}
              </span>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">
                Services Available
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE UGOPAWAVERIFY (FINTECH EXCELLENCE) */}
      <section className="bg-[#121212] text-white py-24 border-t border-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold text-amber-400 tracking-wider uppercase bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Enterprise Trust
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Built for Speed, Accuracy & Compliance
            </h2>
            <p className="text-sm text-gray-400">
              Enterprise-grade digital infrastructure engineered to protect your wallet and eliminate errors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#181818] p-8 rounded-3xl border border-white/5 space-y-4 hover:border-orange-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Guaranteed Idempotency</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Our server-side idempotency lock ensures you are never double-charged, even during network hiccups or repeated clicks.
              </p>
            </div>

            <div className="bg-[#181818] p-8 rounded-3xl border border-white/5 space-y-4 hover:border-amber-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Authentic Registry Nodes</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                We strictly interface with accredited verification gateways. No fabricated data or placeholders are ever generated.
              </p>
            </div>

            <div className="bg-[#181818] p-8 rounded-3xl border border-white/5 space-y-4 hover:border-orange-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Bank-Grade Request Security</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Every request is reviewed and confirmed with a clear authorization check, ensuring complete control over your wallet funds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold text-gray-950">How It Works in 4 Steps</h2>
          <p className="text-xs text-gray-500">
            Seamless flow designed for agents, business teams, and individuals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Register Account', desc: 'Sign up in under 60 seconds with your secure account credentials.' },
            { step: '02', title: 'Fund Your Wallet', desc: 'Instant automated top-up with credits deposited immediately to your account.' },
            { step: '03', title: 'Submit Identifier', desc: 'Select your verification service (NIN, BVN, Phone) and enter the details.' },
            { step: '04', title: 'Print & Download', desc: 'View live verification responses and download your official PDF slip with QR.' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm relative">
              <span className="text-3xl font-black text-amber-500/30 font-mono block mb-2">
                {item.step}
              </span>
              <h4 className="text-base font-bold text-gray-900 mb-1">{item.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-gradient-to-tr from-[#121212] via-[#1E1E1E] to-[#121212] text-white py-16 border-y border-[#262626]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Verify Identity Records Instantly?
          </h2>
          <p className="text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
            Join thousands of registered businesses and verification agents across Nigeria utilizing UGOPAWAVERIFY for rapid, dependable KYC.
          </p>
          <div className="pt-2">
            <button
              id="bottom-cta-get-started-btn"
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-base hover:brightness-110 shadow-xl shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Official Platform Footer */}
      <Footer />
    </div>
  );
};
