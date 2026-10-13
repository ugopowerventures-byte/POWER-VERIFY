import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Award,
  CreditCard,
  ShieldCheck,
  User,
  Fingerprint,
  Calendar,
  Phone,
  MapPin,
  Building,
  Flag,
  FileCheck,
  FileText,
  Image as ImageIcon,
  Loader2,
  Clock,
  Hash,
  ShieldAlert,
  Shield,
  Camera
} from 'lucide-react';
import { toJpeg, toPng } from 'html-to-image';
import { VerificationRequest, VerificationResult } from '../../types';
import {
  generatePremiumSlipPdf,
  generateStandardSlipPdf,
  generateRegularSlipPdf,
  generateVerificationSlipPdf,
  getAvailableSlipFormats,
  extractNormalizedCitizen,
  preloadSlipTemplates,
  urlToDataUrl,
  SlipFormatType
} from '../../lib/pdfGenerator';
import { formatCurrency } from '../../utils/currency';

interface VerificationSlipProps {
  request: VerificationRequest;
  result?: VerificationResult | null;
  onClose?: () => void;
  onNewVerification?: () => void;
}

export const VerificationSlip: React.FC<VerificationSlipProps> = ({
  request,
  result,
  onClose,
  onNewVerification
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  const availableFormats = getAvailableSlipFormats(request.serviceCode, request.serviceName);
  const hasFormatOptions = availableFormats !== null && availableFormats.length > 0;

  const citizen = extractNormalizedCitizen(request, result);
  const isFailed = request.status === 'FAILED';
  const isPending = request.status === 'PENDING' || request.status === 'PROCESSING';

  // Format verified timestamps
  const verifiedDateObj = new Date(citizen.verifiedAt);
  const formattedDate = !isNaN(verifiedDateObj.getTime())
    ? verifiedDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const formattedTime = !isNaN(verifiedDateObj.getTime())
    ? verifiedDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    : '—';

  // Service details card title adaptively
  const sCode = (request.serviceCode || '').toUpperCase();
  const sName = (request.serviceName || '').toLowerCase();
  let detailsCardTitle = 'NIN DETAILS';
  if (sCode.includes('BVN') || sName.includes('bvn')) {
    detailsCardTitle = 'BVN DETAILS';
  } else if (sCode.includes('DRIVER') || sName.includes('licence') || sName.includes('license')) {
    detailsCardTitle = 'DRIVING LICENCE DETAILS';
  } else if (!sCode.startsWith('NIN') && !sName.includes('nin')) {
    detailsCardTitle = 'IDENTITY PARTICULARS';
  }

  // Generate QR code and preload slip templates in background for instant downloading
  useEffect(() => {
    if (!isFailed && citizen) {
      const qrText = `BAZERIGHTVERIFY|REF:${request.reference}|ID:${citizen.nin || citizen.bvn || citizen.idNumber}|NAME:${citizen.fullName}|STATUS:VERIFIED`;
      QRCode.toDataURL(qrText, { width: 180, margin: 1 })
        .then(setQrCodeDataUrl)
        .catch((e) => console.warn('QR code gen error:', e));

      // Warm up slip templates and photo in background
      preloadSlipTemplates().catch(() => {});
      if (citizen.photoUrl && !citizen.photoUrl.startsWith('data:')) {
        urlToDataUrl(citizen.photoUrl, 3000).catch(() => {});
      }
    }
  }, [request.reference, citizen, isFailed]);

  // Click outside to close PDF dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPdfDropdown(false);
      }
    };
    if (showPdfDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPdfDropdown]);

  // Download PDF Handler (Produces exact unflattened vector slip PDF with real selectable text)
  const handleDownloadPdf = async (format?: SlipFormatType) => {
    if (isFailed) return;
    try {
      setShowPdfDropdown(false);
      setDownloading(true);
      setDownloadingFormat(`PDF (${format || 'Slip'})`);

      // Determine target format (if not passed, use first available format or default to PREMIUM)
      const targetFormat = format || (hasFormatOptions && availableFormats ? availableFormats[0]?.id : 'PREMIUM');

      if (targetFormat === 'STANDARD') {
        await generateStandardSlipPdf(request, result);
        return;
      } else if (targetFormat === 'REGULAR') {
        await generateRegularSlipPdf(request, result);
        return;
      } else if (targetFormat === 'PREMIUM') {
        await generatePremiumSlipPdf(request, result);
        return;
      }

      // Default router
      await generateVerificationSlipPdf(request, result);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setDownloading(false);
      setDownloadingFormat(null);
    }
  };

  // Download JPG Handler (Captures the rendered official verified result card)
  const handleDownloadJpg = async () => {
    if (isFailed) return;
    const node = document.getElementById('bazeright-verified-dashboard-card');
    if (!node) return;
    try {
      setDownloading(true);
      setDownloadingFormat('JPG');
      const dataUrl = await toJpeg(node, {
        quality: 0.92,
        pixelRatio: 1.5,
        backgroundColor: '#0B0B0B',
        skipFonts: true,
        cacheBust: false
      });
      const link = document.createElement('a');
      link.download = `BAZERIGHTVERIFY-${request.reference}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate JPG image:', err);
    } finally {
      setDownloading(false);
      setDownloadingFormat(null);
    }
  };

  // Download PNG Handler (Captures the rendered official verified result card)
  const handleDownloadPng = async () => {
    if (isFailed) return;
    const node = document.getElementById('bazeright-verified-dashboard-card');
    if (!node) return;
    try {
      setDownloading(true);
      setDownloadingFormat('PNG');
      const dataUrl = await toPng(node, {
        pixelRatio: 1.5,
        backgroundColor: '#0B0B0B',
        skipFonts: true,
        cacheBust: false
      });
      const link = document.createElement('a');
      link.download = `BAZERIGHTVERIFY-${request.reference}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate PNG image:', err);
    } finally {
      setDownloading(false);
      setDownloadingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Action Toolbar (Screen only) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h3 className="font-bold text-[#14213D] text-base sm:text-lg">
              Verification Result Dashboard
            </h3>
            <p className="text-xs text-gray-500">
              Ref: <span className="font-mono font-medium text-gray-800">{request.reference}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isFailed && !isPending && (
            <button
              id="btn-print-slip"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Record</span>
            </button>
          )}

          {isPending && (
            <a
              href="/my-service-requests"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-black text-xs sm:text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              <span>Track in My Requests</span>
            </a>
          )}

          {onNewVerification && (
            <button
              onClick={onNewVerification}
              className="px-4 py-2 rounded-xl bg-[#080B0A] text-white text-xs sm:text-sm font-semibold hover:bg-black transition-colors cursor-pointer"
            >
              New Verification
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXACT VISUAL TEMPLATE CANVAS MATCHING THE NEW REFERENCE DESIGN */}
      {/* ========================================================================= */}
      <div
        id="bazeright-verified-dashboard-card"
        ref={printableRef}
        className="relative bg-[#0B0B0B] text-white rounded-3xl p-4 sm:p-7 space-y-6 shadow-2xl overflow-hidden border border-[#222222]"
      >
        {/* Dynamic Curved Glowing Ribbon Backgrounds */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-[#E03E00]/30 via-[#FF9900]/25 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-[#E03E00]/25 via-[#FFA600]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Decorative dynamic curves SVG matching reference */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          preserveAspectRatio="none"
          viewBox="0 0 1000 1000"
        >
          <path
            d="M-100,220 C300,60 700,360 1100,120"
            fill="none"
            stroke="url(#ribbonGrad1)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M-100,260 C320,100 680,400 1100,160"
            fill="none"
            stroke="url(#ribbonGrad2)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M-100,780 C400,580 600,940 1100,740"
            fill="none"
            stroke="url(#ribbonGrad1)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="ribbonGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E01A1A" />
              <stop offset="50%" stopColor="#FF6B00" />
              <stop offset="100%" stopColor="#FFA600" />
            </linearGradient>
            <linearGradient id="ribbonGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFA600" />
              <stop offset="100%" stopColor="#FFD000" />
            </linearGradient>
          </defs>
        </svg>

        {/* 1. TOP HEADER */}
        <header className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          {/* LEFT SIDE: Shield/fingerprint logo + BAZERIGHT VERIFY */}
          <div className="flex items-center gap-3.5">
            {/* Security Shield / Fingerprint Symbol */}
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-2 border-[#FFA600] flex items-center justify-center p-2.5 shadow-lg shadow-orange-500/20 shrink-0 relative">
              <svg
                className="w-full h-full text-[#FF7A00]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#shieldGrad)" fillOpacity="0.25" />
                <path d="M12 11c0 1.66-1.34 3-3 3" stroke="#FFD000" strokeWidth="1.8" />
                <path d="M12 7c-2.76 0-5 2.24-5 5 0 1.38.56 2.63 1.46 3.54" stroke="#FF5A00" strokeWidth="1.8" />
                <path d="M12 3a9 9 0 0 0-9 9c0 2.21.8 4.23 2.13 5.8" stroke="#F21F1F" strokeWidth="1.5" />
                <path d="M12 15a3 3 0 0 0 3-3c0-.62-.19-1.2-.51-1.68" stroke="#FFD000" strokeWidth="1.8" />
                <path d="M16.5 15.5A7 7 0 0 0 19 12a7 7 0 0 0-7-7" stroke="#FF7A00" strokeWidth="1.8" />
                <defs>
                  <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF5A00" />
                    <stop offset="50%" stopColor="#F21F1F" />
                    <stop offset="100%" stopColor="#FFD000" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FFD000]" />
            </div>

            <div>
              <div className="flex items-baseline tracking-tight">
                <span className="text-2xl sm:text-3xl font-black text-white">BAZERIGHT</span>
                <span className="text-2xl sm:text-3xl font-black ml-1.5 text-[#FFA600]">
                  VERIFY
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-gray-300 tracking-wider mt-0.5">
                Fast &nbsp;•&nbsp; Secure &nbsp;•&nbsp; Reliable
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: Your Identity, Our Priority */}
          <div className="text-left sm:text-right">
            <span className="block text-base sm:text-lg font-bold text-white leading-tight">
              Your Identity,
            </span>
            <span className="block text-lg sm:text-xl font-black text-[#FFA600] leading-tight">
              Our Priority
            </span>
          </div>
        </header>

        {/* 2. VERIFICATION RESULT BANNER */}
        {isFailed ? (
          <div className="relative z-10 bg-gradient-to-r from-[#111513] via-[#1a0f0f] to-[#F21F1F]/20 p-5 sm:p-6 rounded-2xl border-2 border-red-500/40 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase">
                    VERIFICATION
                  </span>
                  <span className="text-xl sm:text-2xl font-black tracking-wide text-red-400 uppercase">
                    UNSUCCESSFUL
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                  {request.errorMessage || 'No matching identity record was found in the official registry.'}
                </p>
              </div>
            </div>
            <div className="shrink-0 bg-red-600 text-white text-xs font-extrabold uppercase px-4 py-1.5 rounded-full tracking-wider shadow">
              Failed
            </div>
          </div>
        ) : isPending ? (
          <div className="relative z-10 bg-gradient-to-r from-[#080B0A] via-[#1a1408] to-[#FF5A00]/20 p-5 sm:p-6 rounded-2xl border-2 border-amber-500/40 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-full p-1 bg-gradient-to-tr from-[#FF5A00] via-[#FFD000] to-white shrink-0 shadow-lg">
                <div className="w-full h-full rounded-full bg-amber-500 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-black stroke-[2.5] animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase">
                    SERVICE REQUEST
                  </span>
                  <span className="text-xl sm:text-2xl font-black tracking-wide text-amber-400 uppercase">
                    PENDING
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                  Your request has been submitted to the Admin Dashboard. Status: PENDING. Credits deducted from your wallet.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 bg-amber-500 text-black text-xs font-black uppercase px-4 py-1.5 rounded-full tracking-wider shadow">
              <span className="w-2 h-2 rounded-full bg-black animate-ping" />
              <span>Pending</span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#A00808] via-[#FF4D00] to-[#FFA200] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-white/20">
            <div className="flex items-center gap-4 text-center sm:text-left">
              {/* Concentric circular badge: Outer white ring, inner green ring, solid green fill #16A34A with crisp white checkmark */}
              <div className="w-14 h-14 rounded-full p-1 bg-white shadow-md flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full bg-[#16A34A] flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-white stroke-[2.5]" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase">
                    VERIFICATION
                  </span>
                  <span className="text-xl sm:text-2xl font-black tracking-wide text-[#FFDF00] uppercase">
                    RESULT
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white/95 font-medium mt-0.5">
                  The identity has been successfully verified.
                </p>
              </div>
            </div>

            {/* Right: Status Pill: solid green #16A34A with border-2 border-white */}
            <div className="shrink-0">
              <div className="bg-[#16A34A] border-2 border-white rounded-full px-5 py-2 flex items-center gap-2 shadow-lg">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] stroke-[3]" />
                </div>
                <span className="text-white font-black text-sm tracking-wide">
                  Successful
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pending Request Details View (if Pending) */}
        {isPending && (
          <div className="relative z-10 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 space-y-4 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200">
              <span className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
                Request Filing Details
              </span>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                Ticket: {request.ticketId || request.reference}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-white rounded-xl border border-gray-200">
                <span className="text-gray-500 block">Service Requested:</span>
                <span className="font-bold text-gray-900 text-sm">{request.serviceName}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-200">
                <span className="text-gray-500 block">Current Status:</span>
                <span className="font-bold text-amber-600 text-sm">PENDING (In Admin Queue)</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-200">
                <span className="text-gray-500 block">Filing Date:</span>
                <span className="font-bold text-gray-900">{formattedDate} at {formattedTime}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-200">
                <span className="text-gray-500 block">Customer Account:</span>
                <span className="font-bold text-gray-900">{request.userName || citizen.fullName}</span>
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-amber-200 text-xs text-gray-700 space-y-2">
              <p className="font-semibold text-gray-900">Next Steps & Delivery:</p>
              <p>
                Your service request has been transmitted directly to our admin operations desk. The fee was deducted from your wallet. You will NOT be charged again when Admin processes and delivers the completed job.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <a
                  href="/my-service-requests"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-extrabold text-xs transition-colors"
                >
                  <span>View in My Service Requests</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
                {onNewVerification && (
                  <button
                    onClick={onNewVerification}
                    className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-black cursor-pointer"
                  >
                    Start Another Filing
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. MAIN WHITE CONTAINER CARD (Only for Successful State) */}
        {!isFailed && !isPending && (
          <div className="relative z-10 bg-white text-gray-900 rounded-3xl border-[3px] border-[#FF6B00] shadow-2xl p-4 sm:p-6 space-y-5">
            {/* 2-Column Grid matching reference */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* LEFT COLUMN (5 cols on md+) */}
              <div className="md:col-span-5 space-y-5">
                {/* PHOTO CARD */}
                <div className="rounded-xl border border-orange-400 overflow-hidden bg-white shadow-sm flex flex-col">
                  {/* Header Bar */}
                  <div className="bg-gradient-to-r from-[#111111] via-[#1E1E1E] to-[#111111] border-b-2 border-[#FF6B00] px-4 py-2 flex items-center justify-between text-white">
                    <span className="font-black text-xs uppercase tracking-wider text-white">
                      PHOTO
                    </span>
                    <Camera className="w-4 h-4 text-[#FFA600]" />
                  </div>

                  {/* Body with headshot */}
                  <div className="p-4 flex flex-col items-center justify-center bg-gray-50/50">
                    <div className="w-36 h-44 sm:w-40 sm:h-48 rounded-lg overflow-hidden border-2 border-orange-200 bg-white shadow-sm flex items-center justify-center relative">
                      {citizen.photoUrl ? (
                        <img
                          src={citizen.photoUrl}
                          alt={citizen.fullName || 'Verified Citizen Photo'}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const proxied = `/api/slip-template-proxy?url=${encodeURIComponent(citizen.photoUrl)}`;
                            if (target.src !== proxied) {
                              target.src = proxied;
                            }
                          }}
                        />
                      ) : (
                        <div className="text-center p-4">
                          <User className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                          <span className="text-[11px] font-bold text-gray-400 uppercase block">
                            Photo Unavailable
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[9px] font-black uppercase text-center py-1 tracking-wider">
                        OFFICIAL BIOMETRIC
                      </div>
                    </div>

                    <div className="mt-2.5 text-center">
                      <span className="text-xs font-black text-gray-900 block uppercase">
                        {citizen.fullName || 'VERIFIED CITIZEN'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Ref: {request.reference}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NIN DETAILS CARD */}
                <div className="rounded-2xl border border-orange-200 overflow-hidden bg-white shadow-sm">
                  {/* Header Bar */}
                  <div className="bg-gradient-to-r from-[#E01A1A] via-[#FF5500] to-[#FFA600] px-4 py-2 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-white" />
                      <span className="font-black text-xs uppercase tracking-wider text-white">
                        {detailsCardTitle}
                      </span>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-gray-100 text-xs">
                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <Hash className="w-4 h-4 text-[#FF5500]" />
                        <span>{sCode.includes('BVN') ? 'BVN Number' : 'NIN Number'}</span>
                      </div>
                      <span className="font-black text-[#E01A1A] font-mono text-sm tracking-wider text-right">
                        {citizen.nin || citizen.bvn || citizen.idNumber || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <MapPin className="w-4 h-4 text-[#FF5500]" />
                        <span>State of Origin</span>
                      </div>
                      <span className="font-bold text-gray-900 uppercase text-right">
                        {citizen.stateOfOrigin || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <Building className="w-4 h-4 text-[#FF5500]" />
                        <span>LGA</span>
                      </div>
                      <span className="font-bold text-gray-900 uppercase text-right">
                        {citizen.lgaOfOrigin || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <MapPin className="w-4 h-4 text-[#FF7A00]" />
                        <span>Town/City</span>
                      </div>
                      <span className="font-bold text-gray-900 uppercase text-right">
                        {citizen.town || citizen.lgaOfOrigin || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <MapPin className="w-4 h-4 text-[#FF5500]" />
                        <span>Address</span>
                      </div>
                      <span className="font-bold text-gray-900 text-[11px] sm:text-xs text-right max-w-[60%] uppercase">
                        {citizen.residenceAddress || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ADDITIONAL INFORMATION CARD */}
                <div className="rounded-2xl border border-orange-200 overflow-hidden bg-white shadow-sm">
                  {/* Header Bar */}
                  <div className="bg-gradient-to-r from-[#E01A1A] via-[#FF5500] to-[#FFA600] px-4 py-2 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span className="font-black text-xs uppercase tracking-wider text-white">
                        ADDITIONAL INFORMATION
                      </span>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-gray-100 text-xs">
                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <Phone className="w-4 h-4 text-[#FF5500]" />
                        <span>Phone Number</span>
                      </div>
                      <span className="font-bold text-gray-900 font-mono text-right">
                        {citizen.phoneNumber || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <Calendar className="w-4 h-4 text-[#FF7A00]" />
                        <span>Registration Date</span>
                      </div>
                      <span className="font-bold text-gray-900 font-mono text-right">
                        {citizen.registrationDate || formattedDate}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <ShieldCheck className="w-4 h-4 text-[#FF5500]" />
                        <span>Status</span>
                      </div>
                      <span className="px-3 py-0.5 rounded-full text-xs font-black bg-[#16A34A] text-white shadow-xs">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (7 cols on md+) */}
              <div className="md:col-span-7 space-y-5">
                {/* PERSONAL INFORMATION CARD */}
                <div className="rounded-2xl border border-orange-200 overflow-hidden bg-white shadow-sm">
                  {/* Header Bar */}
                  <div className="bg-gradient-to-r from-[#E01A1A] via-[#FF5500] to-[#FFA600] px-4 py-2 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-white" />
                      <span className="font-black text-xs uppercase tracking-wider text-white">
                        PERSONAL INFORMATION
                      </span>
                    </div>
                  </div>

                  {/* 7 Key-Value Rows */}
                  <div className="divide-y divide-gray-100 text-xs">
                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <User className="w-4 h-4 text-[#FF5500]" />
                        <span>Full Name</span>
                      </div>
                      <span className="font-black text-gray-900 text-sm text-right uppercase">
                        {citizen.fullName || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <User className="w-4 h-4 text-[#FF7A00]" />
                        <span>First Name</span>
                      </div>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm text-right uppercase">
                        {citizen.firstName || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <User className="w-4 h-4 text-[#FF7A00]" />
                        <span>Middle Name</span>
                      </div>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm text-right uppercase">
                        {citizen.middleName || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <User className="w-4 h-4 text-[#FF5500]" />
                        <span>Last Name</span>
                      </div>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm text-right uppercase">
                        {citizen.surname || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <Calendar className="w-4 h-4 text-[#FF5500]" />
                        <span>Date of Birth</span>
                      </div>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm font-mono text-right">
                        {citizen.dateOfBirth || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <Fingerprint className="w-4 h-4 text-[#FF5500]" />
                        <span>Gender</span>
                      </div>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm text-right uppercase">
                        {citizen.gender || '—'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 text-gray-500 font-medium">
                        <Flag className="w-4 h-4 text-[#FF7A00]" />
                        <span>Nationality</span>
                      </div>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm text-right">
                        {citizen.nationality || 'Nigerian'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VERIFICATION INFORMATION CARD */}
                <div className="rounded-2xl border border-orange-200 overflow-hidden bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    {/* Header Bar: Dark Charcoal with gold/orange right edge accent */}
                    <div className="bg-gradient-to-r from-[#1E1E1E] to-[#3A3A3A] border-r-4 border-[#FFA600] px-4 py-2 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#FFA600]" />
                        <span className="font-black text-xs uppercase tracking-wider text-white">
                          VERIFICATION INFORMATION
                        </span>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-100 text-xs">
                      <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                          <Hash className="w-4 h-4 text-[#FF5500]" />
                          <span>PAWAVERIFY Tracking ID</span>
                        </div>
                        <span className="font-black text-xs sm:text-sm font-mono text-gray-900 text-right break-all">
                          {citizen.trackingId || request.reference}
                        </span>
                      </div>

                      <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                          <Calendar className="w-4 h-4 text-[#FF5500]" />
                          <span>Verification Date</span>
                        </div>
                        <span className="font-bold text-xs sm:text-sm font-mono text-gray-900 text-right">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                          <Clock className="w-4 h-4 text-[#FF5500]" />
                          <span>Verification Time</span>
                        </div>
                        <span className="font-bold text-xs sm:text-sm font-mono text-gray-900 text-right">
                          {formattedTime} (WAT)
                        </span>
                      </div>

                      <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                          <FileText className="w-4 h-4 text-[#FF5500]" />
                          <span>Service Used</span>
                        </div>
                        <span className="font-black text-xs sm:text-sm text-gray-900 text-right">
                          {request.serviceName || 'NIN Verification'}
                        </span>
                      </div>

                      <div className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                          <Shield className="w-4 h-4 text-[#FF7A00]" />
                          <span>Provider Reference</span>
                        </div>
                        <span className="font-bold text-xs sm:text-sm font-mono text-gray-900 text-right break-all">
                          {citizen.providerReference || request.reference}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Disclaimer Box */}
                  <div className="m-3 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#92400E] shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-snug text-[#78350F] font-medium">
                      This result is provided by the official verification provider and verified through <strong className="font-bold">PAWAVERIFY</strong>. The information displayed is exactly as received from the provider's API.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* DOWNLOAD VERIFICATION SLIP SECTION */}
            <div className="rounded-2xl border border-orange-300 bg-gradient-to-r from-[#FFF0DB] via-[#FFE7C7] to-[#FFDEB3] p-4 sm:p-5 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5 text-center lg:text-left">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shrink-0 shadow-md border-2 border-white">
                  <Download className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                    Download Verification Slip
                  </h4>
                  <p className="text-xs text-gray-600 font-medium">
                    Get your official verification slip in your preferred format.
                  </p>
                </div>
              </div>

              {/* 3 Download Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
                {/* PDF Button */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => {
                      if (hasFormatOptions && availableFormats.length > 1) {
                        setShowPdfDropdown((prev) => !prev);
                      } else {
                        handleDownloadPdf();
                      }
                    }}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-red-600 font-bold text-xs border border-orange-200 hover:bg-orange-50/80 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {downloading && downloadingFormat?.includes('PDF') ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-red-600" />
                        <span>Download Official PDF Slip</span>
                        {hasFormatOptions && availableFormats.length > 1 && (
                          <ChevronDown className="w-3 h-3 ml-0.5 text-gray-400" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Dropdown if official formats exist */}
                  {hasFormatOptions && showPdfDropdown && (
                    <div className="absolute right-0 bottom-full mb-2 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 px-2 text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          Select Slip Format
                        </span>
                        <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
                          Options
                        </span>
                      </div>
                      <div className="py-1 space-y-1">
                        <button
                          onClick={() => handleDownloadPdf()}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all flex items-start gap-2.5 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-xs text-gray-900 block">
                              Full Verification Report (PDF)
                            </span>
                            <p className="text-[11px] text-gray-500">
                              Official slip matching this verification card
                            </p>
                          </div>
                        </button>
                        {availableFormats.map((fmt) => (
                          <button
                            key={fmt.id}
                            onClick={() => handleDownloadPdf(fmt.id)}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all flex items-start gap-2.5 cursor-pointer"
                          >
                            <Award className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-extrabold text-xs text-gray-900 block">
                                {fmt.label}
                              </span>
                              <p className="text-[11px] text-gray-500 truncate">
                                {fmt.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* JPG Button */}
                <button
                  onClick={handleDownloadJpg}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-emerald-700 font-bold text-xs border border-orange-200 hover:bg-orange-50/80 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {downloading && downloadingFormat === 'JPG' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      <span>Rendering JPG...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 text-emerald-700" />
                      <span>Download JPG (Image Format)</span>
                    </>
                  )}
                </button>

                {/* PNG Button */}
                <button
                  onClick={handleDownloadPng}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-blue-600 font-bold text-xs border border-orange-200 hover:bg-orange-50/80 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {downloading && downloadingFormat === 'PNG' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Rendering PNG...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>Download PNG (Image Format)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. FOOTER */}
        <footer className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t border-white/10 text-white">
          {/* LEFT: Logo + BAZERIGHTVERIFY + Slogan */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] border border-[#FFA600] flex items-center justify-center p-1 shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#FFA600]" />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-sm font-black text-white">BAZERIGHT</span>
                <span className="text-sm font-black ml-1 text-[#FFA600]">VERIFY</span>
              </div>
              <p className="text-[10px] text-gray-400">Fast &nbsp;•&nbsp; Secure &nbsp;•&nbsp; Reliable</p>
            </div>
          </div>

          {/* CENTER: Yellow shield check icon + Text */}
          <div className="flex items-center gap-2 text-center">
            <ShieldCheck className="w-4 h-4 text-[#FFD000] shrink-0" />
            <span className="text-xs font-bold text-[#FFD000]">
              Secure Identity Verification for a Safer Tomorrow
            </span>
          </div>

          {/* RIGHT: Nigerian Flag + Proudly Nigerian */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <div className="flex h-3.5 w-5.5 rounded-xs overflow-hidden border border-white/20 shadow-xs">
              <div className="h-full w-1/3 bg-[#008751]" />
              <div className="h-full w-1/3 bg-white" />
              <div className="h-full w-1/3 bg-[#008751]" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wide">
              Proudly Nigerian
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
