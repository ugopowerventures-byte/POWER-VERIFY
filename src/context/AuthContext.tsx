import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { UserSummary, Wallet, PublicSettings, Announcement, Notification } from '../types';

interface AuthContextType {
  user: UserSummary | null;
  wallet: Wallet | null;
  unreadCount: number;
  settings: PublicSettings | null;
  activeAnnouncements: Announcement[];
  notifications: Notification[];
  isLoading: boolean;
  currentPath: string;
  navigate: (path: string) => void;
  login: (token: string, user: UserSummary) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_SETTINGS: PublicSettings = {
  platformName: 'BAZERIGHTVERIFY',
  logoText: 'BAZERIGHTVERIFY',
  tagline: 'Fast, Secure & Reliable Identity Verification Platform',
  supportWhatsapp: '+2348030000000',
  supportEmail: 'contact@bazerightverify.com.ng',
  whatsappNumber: '07071944789',
  phoneNumber1: '07071944789',
  phoneNumber2: '07018486189',
  businessEmail: 'contact@bazerightverify.com.ng',
  unitValueNgn: 200,
  currency: 'Credits',
  currencySymbol: 'Credits',
  minWalletFunding: 1000,
  maxWalletFunding: 1000000,
  maintenanceMode: false,
  bankDetails: {
    bankName: 'Moniepoint Microfinance Bank',
    accountNumber: '8249103821',
    accountName: 'BAZERIGHT VERIFY SERVICES LTD'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!api.getToken();
  });

  // Simple, robust browser path routing with window history
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    const handleSuspended = (e: any) => {
      const msg = e.detail?.message || 'Your account has been suspended. Please contact an administrator.';
      setUser(null);
      setWallet(null);
      api.setToken(null);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('suspension_notice', msg);
      }
      navigate('/login');
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('auth:suspended', handleSuspended);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('auth:suspended', handleSuspended);
    };
  }, [navigate]);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.get('/settings/public');
      setSettings(data);
      const ann = await api.get('/announcements/active');
      setActiveAnnouncements(ann || []);
    } catch (err) {
      console.warn('Failed to load public settings:', err);
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const data = await api.get('/wallet/summary');
      setWallet(data);
    } catch (err) {
      console.warn('Failed to refresh wallet:', err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const list = await api.get('/notifications');
      setNotifications(list || []);
      const unread = (list || []).filter((n: Notification) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!api.getToken()) {
      setUser(null);
      setWallet(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
      setWallet(res.wallet);
      setUnreadCount(res.unreadNotifications || 0);
      refreshNotifications();
    } catch (err) {
      console.warn('Session check failed, logging out:', err);
      api.setToken(null);
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    refreshSettings();
    refreshUser();

    // Real-time synchronization: Revalidate settings, announcements, and wallet on focus and every 10 seconds
    const handleFocus = () => {
      refreshSettings();
      if (api.getToken()) {
        refreshWallet();
        refreshNotifications();
      }
    };
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      refreshSettings();
      if (api.getToken()) {
        refreshWallet();
        refreshNotifications();
      }
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshSettings, refreshUser, refreshWallet, refreshNotifications]);

  const login = (token: string, userData: UserSummary) => {
    api.setToken(token);
    setUser(userData);
    refreshUser();
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect && redirect.startsWith('/')) {
      navigate(redirect);
    } else if (userData?.role === 'MEGA_ADMIN' || userData?.role === 'SUPER_ADMIN' || userData?.role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setWallet(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        unreadCount,
        settings,
        activeAnnouncements,
        notifications,
        isLoading,
        currentPath,
        navigate,
        login,
        logout,
        refreshUser,
        refreshWallet,
        refreshNotifications,
        refreshSettings
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
