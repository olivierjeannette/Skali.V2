import Stripe from 'stripe';

// Singleton Stripe instance
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

// Platform configuration
export const PLATFORM_CONFIG = {
  // Platform fee percentage for member transactions (default)
  DEFAULT_PLATFORM_FEE_PERCENT: 0.5,

  // Platform fees by country (adhérents -> salle)
  // Ces fees sont pris sur chaque transaction des adhérents
  PLATFORM_FEES_BY_COUNTRY: {
    FR: 0.5,  // 0.5% pour la France
    BE: 0.5,  // 0.5% pour la Belgique
    CH: 0.5,  // 0.5% pour la Suisse
    CA: 1.0,  // 1.0% pour le Canada
    US: 1.0,  // 1.0% pour les USA (si jamais)
    DEFAULT: 0.5,  // Défaut pour autres pays
  } as Record<string, number>,

  // Platform subscription plans for gyms
  PLATFORM_PLANS: {
    starter: {
      name: 'Starter',
      priceMonthly: 29,
      features: {
        max_members: 50,
        max_staff: 2,
        tv_displays: 1,
        api_access: false,
        custom_domain: false,
        priority_support: false,
      },
    },
    pro: {
      name: 'Pro',
      priceMonthly: 79,
      features: {
        max_members: 200,
        max_staff: 5,
        tv_displays: 3,
        api_access: true,
        custom_domain: false,
        priority_support: true,
      },
    },
    enterprise: {
      name: 'Enterprise',
      priceMonthly: 199,
      features: {
        max_members: -1, // Unlimited
        max_staff: -1,
        tv_displays: -1,
        api_access: true,
        custom_domain: true,
        priority_support: true,
      },
    },
  },

  // Trial period in days
  TRIAL_DAYS: 14,

  // Currency
  CURRENCY: 'eur',
} as const;

// Helper to convert euros to cents
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

// Helper to convert cents to euros
export function centsToEuros(cents: number): number {
  return cents / 100;
}

// Calculate platform fee from amount
export function calculatePlatformFee(amountCents: number, feePercent: number = PLATFORM_CONFIG.DEFAULT_PLATFORM_FEE_PERCENT): number {
  return Math.ceil(amountCents * feePercent / 100);
}

// Get platform fee percentage for a country
export function getPlatformFeeForCountry(countryCode: string): number {
  const upperCountry = countryCode.toUpperCase();
  return PLATFORM_CONFIG.PLATFORM_FEES_BY_COUNTRY[upperCountry]
    ?? PLATFORM_CONFIG.PLATFORM_FEES_BY_COUNTRY.DEFAULT
    ?? PLATFORM_CONFIG.DEFAULT_PLATFORM_FEE_PERCENT;
}

// Calculate platform fee based on country
export function calculatePlatformFeeByCountry(amountCents: number, countryCode: string): number {
  const feePercent = getPlatformFeeForCountry(countryCode);
  return calculatePlatformFee(amountCents, feePercent);
}
