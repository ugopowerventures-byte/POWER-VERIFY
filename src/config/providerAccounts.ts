/**
 * Central Provider Accounts Configuration for BAZERIGHTVERIFY
 * 
 * Official external provider accounts configuration used across the application.
 * All dashboard and documentation URLs are strictly verified official provider links.
 * 
 * NOTE: Private/Secret API credentials must NEVER be placed here.
 * They are securely managed on the backend server environment.
 */

export interface ProviderOfficialMeta {
  slug: 'ninja' | 'veripine' | 'paystack';
  name: string;
  badgeName: string;
  serviceCategory: string;
  assignedServices: string[];
  dashboardUrl: string;
  docsUrl: string;
  defaultEnvironment: 'PRODUCTION LIVE' | 'SANDBOX / DEV';
  description: string;
  accountEmailHint: string;
  tags: string[];
  colorTheme: {
    accent: string;
    border: string;
    bgGlow: string;
    badgeBg: string;
    badgeText: string;
  };
}

export const OFFICIAL_PROVIDER_CONFIGS: Record<string, ProviderOfficialMeta> = {
  ninja: {
    slug: 'ninja',
    name: 'Ninja API',
    badgeName: 'NIN & BVN Gateway',
    serviceCategory: 'NIN/BVN and assigned verification services',
    assignedServices: [
      'NIN Verification',
      'NIN Status Lookup',
      'BVN Verification',
      'BVN by CRM',
      'Identity Cross-Lookup',
      'Driving Licence Verification'
    ],
    // Official Ninja API dashboard and documentation links
    dashboardUrl: 'https://app.ninjaapis.com',
    docsUrl: 'https://docs.ninjaapis.com',
    defaultEnvironment: 'PRODUCTION LIVE',
    description: 'High-speed government identity verification gateway specialized for Nigerian National Identity Management Commission (NIMC) and Bank Verification Number (BVN) validations.',
    accountEmailHint: 'Registered Boucloud/Ninja Enterprise Account',
    tags: ['NIMC', 'BVN', 'NIN', 'FRSC'],
    colorTheme: {
      accent: '#FF6B00',
      border: 'border-orange-500/30',
      bgGlow: 'bg-orange-500/10',
      badgeBg: 'bg-orange-500/15',
      badgeText: 'text-orange-400'
    }
  },
  veripine: {
    slug: 'veripine',
    name: 'Veripine',
    badgeName: 'Civil Registry & Mod Gateway',
    serviceCategory: 'Civil Registry, Phone Lookup & Data Modifications',
    assignedServices: [
      'NIN Phone Search',
      'BVN Retrieval with Phone',
      'Demographic Verification',
      'Personalization Tracking',
      'NIN Name Modification',
      'NIN Phone Modification',
      'NIN Address Modification',
      'NIN Date of Birth Modification',
      'NIN Validation'
    ],
    // Official Veripine dashboard and documentation links
    dashboardUrl: 'https://veripine.com/login',
    docsUrl: 'https://docs.veripine.com',
    defaultEnvironment: 'PRODUCTION LIVE',
    description: 'Premier identity modification and civil registry verification infrastructure powering deep demographic searches, telecom phone-to-NIN lookups, and citizen record updates.',
    accountEmailHint: 'Authorized Veripine Partner Account',
    tags: ['Demographic', 'Phone Search', 'Modifications', 'IPE Clearance'],
    colorTheme: {
      accent: '#06B6D4',
      border: 'border-cyan-500/30',
      bgGlow: 'bg-cyan-500/10',
      badgeBg: 'bg-cyan-500/15',
      badgeText: 'text-cyan-400'
    }
  },
  paystack: {
    slug: 'paystack',
    name: 'Paystack',
    badgeName: 'Live Payment Processor',
    serviceCategory: 'Automated Wallet Funding & Payment Checkout',
    assignedServices: [
      'Automated Wallet Card Funding',
      'Direct Bank Transfer Checkout',
      'Real-time Webhook Verification',
      'Transaction Ledger Settlement'
    ],
    // Official Paystack dashboard and documentation links
    dashboardUrl: 'https://dashboard.paystack.com',
    docsUrl: 'https://paystack.com/docs/api/',
    defaultEnvironment: 'PRODUCTION LIVE',
    description: 'PCI-DSS Level 1 certified payment rail handling instant automated customer deposits, card debits, dedicated virtual accounts, and financial reconciliation in Nigerian Naira (NGN).',
    accountEmailHint: 'Live Merchant Dashboard',
    tags: ['Payments', 'NGN', 'Wallet Top-up', 'Instant Webhooks'],
    colorTheme: {
      accent: '#10B981',
      border: 'border-emerald-500/30',
      bgGlow: 'bg-emerald-500/10',
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-400'
    }
  }
};
