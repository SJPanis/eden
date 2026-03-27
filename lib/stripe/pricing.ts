// lib/stripe/pricing.ts

/**
 * Stripe Package Pricing Configuration
 * Defines the three Leaf packages with pricing and leaf credit amounts
 */

export const STRIPE_PACKAGES = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for getting started',
    leafAmount: 100,
    priceInCents: 499, // $4.99
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || '',
    stripeProductId: process.env.STRIPE_PRODUCT_ID_STARTER || '',
    displayPrice: '$4.99',
    leafPerDollar: 20.04, // 100 / 4.99
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    description: 'Best for regular users',
    leafAmount: 500,
    priceInCents: 1999, // $19.99
    stripePriceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || '',
    stripeProductId: process.env.STRIPE_PRODUCT_ID_PROFESSIONAL || '',
    displayPrice: '$19.99',
    leafPerDollar: 25.01, // 500 / 19.99
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Maximum value for power users',
    leafAmount: 1500,
    priceInCents: 4999, // $49.99
    stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
    stripeProductId: process.env.STRIPE_PRODUCT_ID_ENTERPRISE || '',
    displayPrice: '$49.99',
    leafPerDollar: 30.02, // 1500 / 49.99
  },
} as const;

export type PackageId = keyof typeof STRIPE_PACKAGES;
export type Package = (typeof STRIPE_PACKAGES)[PackageId];

/**
 * Get package configuration by ID
 */
export function getPackageById(id: string): Package | null {
  const packageId = id.toUpperCase() as PackageId;
  return STRIPE_PACKAGES[packageId] || null;
}

/**
 * Get all available packages
 */
export function getAllPackages(): Package[] {
  return Object.values(STRIPE_PACKAGES);
}

/**
 * Validate package configuration
 */
export function isPackageConfigValid(pkg: Package): boolean {
  return !!(
    pkg.id &&
    pkg.name &&
    pkg.leafAmount > 0 &&
    pkg.priceInCents > 0 &&
    pkg.stripePriceId &&
    pkg.stripeProductId
  );
}