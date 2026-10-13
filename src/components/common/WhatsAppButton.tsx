import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle } from 'lucide-react';

export const WhatsAppButton: React.FC = () => {
  const { settings } = useAuth();
  const rawNumber = settings?.whatsappNumber || settings?.supportWhatsapp || '07071944789';
  const cleanNumber = rawNumber.replace(/[^0-9]/g, '');

  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
    'Hello BAZERIGHTVERIFY Support, I need assistance with my verification portal account.'
  )}`;

  return (
    <a
      id="floating-whatsapp-btn"
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white px-4 py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/20"
      aria-label="Contact Support on WhatsApp"
    >
      <MessageCircle className="w-6 h-6 fill-current text-white" />
      <span className="hidden sm:inline-block font-semibold text-sm tracking-wide">
        WhatsApp Support
      </span>
      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
      </span>
    </a>
  );
};
