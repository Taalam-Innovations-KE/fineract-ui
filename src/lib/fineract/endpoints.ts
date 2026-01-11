/**
 * Fineract API endpoint paths (without /v1 prefix)
 * BFF will map these to actual Fineract paths
 */

export const FINERACT_ENDPOINTS = {
  // Organisation
  offices: '/v1/offices',
  staff: '/v1/staff',
  users: '/v1/users',
  roles: '/v1/roles',
  permissions: '/v1/permissions',

  // Financial Setup
  currencies: '/v1/currencies',

  // Products
  loanProducts: '/v1/loanproducts',
  loanProductTemplate: '/v1/loanproducts/template',

  // Operations - COB
  loansCatchUp: '/v1/loans/catch-up',
  loansCatchUpRunning: '/v1/loans/is-catch-up-running',
  loansOldestCOB: '/v1/loans/oldest-cob-closed',
} as const;

/**
 * BFF routes (internal Next.js API routes)
 */
export const BFF_ROUTES = {
  // Organisation
  offices: '/api/fineract/offices',
  staff: '/api/fineract/staff',
  users: '/api/fineract/users',
  roles: '/api/fineract/roles',
  permissions: '/api/fineract/permissions',

  // Financial Setup
  currencies: '/api/fineract/currencies',

  // Products
  loanProducts: '/api/fineract/loanproducts',

  // Operations - COB
  loansCatchUp: '/api/fineract/loans/catch-up',
  loansCatchUpRunning: '/api/fineract/loans/is-catch-up-running',
  loansOldestCOB: '/api/fineract/loans/oldest-cob-closed',
} as const;
