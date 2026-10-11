import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { Bell, CheckCheck, ShieldCheck, Wallet, Info, AlertCircle } from 'lucide-react';
import { Notification } from '../../types';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, refreshNotifications, navigate } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      refreshNotifications();
      if (link) {
        navigate(link);
        setIsOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'VERIFICATION':
        return <ShieldCheck className="w-4 h-4 text-orange-500" />;
      case 'WALLET':
        return <Wallet className="w-4 h-4 text-emerald-500" />;
      case 'SECURITY':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 text-black text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-[#121212]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#1A1A1A] border border-[#2F2F2F] rounded-2xl shadow-2xl z-50 overflow-hidden text-white animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#262626]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.link)}
                  className={`p-3.5 hover:bg-white/5 cursor-pointer transition-colors flex gap-3 items-start ${
                    !n.isRead ? 'bg-orange-500/5' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5 shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold truncate ${!n.isRead ? 'text-white' : 'text-gray-300'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
