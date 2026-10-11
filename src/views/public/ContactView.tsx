import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle2 } from 'lucide-react';

export const ContactView: React.FC = () => {
  const { settings } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate inquiry recording
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-100/60 px-3 py-1 rounded-full">
          Support Desk
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
          Contact UGOPAWAVERIFY
        </h1>
        <p className="text-sm text-gray-600">
          Our specialized verification and compliance desk is available 24/7 to resolve technical and wallet inquiries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Cards */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">Direct Phone & Desk</h4>
            <p className="text-xs text-gray-700 font-mono font-bold">
              {settings?.phoneNumber1 || settings?.whatsappNumber || '07071944789'}
            </p>
            {settings?.phoneNumber2 && (
              <p className="text-xs text-gray-700 font-mono font-bold">
                {settings.phoneNumber2}
              </p>
            )}
            <p className="text-[11px] text-gray-400">Available Mon-Sat 8:00am - 8:00pm WAT</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">WhatsApp Instant Desk</h4>
            <p className="text-xs text-emerald-700 font-mono font-bold">
              {settings?.whatsappNumber || settings?.supportWhatsapp || '07071944789'}
            </p>
            <p className="text-[11px] text-gray-400">Fast 24/7 technical and portal verification assistance</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">Official Business Email</h4>
            <p className="text-xs text-gray-700 font-mono font-bold">{settings?.businessEmail || settings?.supportEmail || 'contact@ugopawaverify.com.ng'}</p>
            <p className="text-[11px] text-gray-400">Target response time: under 30 minutes</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">Corporate Offices</h4>
            <p className="text-xs text-gray-500">
              Victoria Island, Lagos State & Central Business District, FCT Abuja, Nigeria
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Message Received</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Thank you for contacting UGOPAWAVERIFY support. An agent has received your dispatch and will respond promptly via email.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Send an Inquiry</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Samuel Ade"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="samuel@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Wallet Funding Inquiry or API Access"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your inquiry or question..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] text-black font-bold text-sm hover:brightness-110 shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Sending...' : 'Transmit Message'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
