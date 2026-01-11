import { z } from 'zod';

/**
 * Loan Product Wizard Schema
 * Multi-step form with required fields from OpenAPI
 */

// Step 1: Basics
export const loanProductBasicsSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  shortName: z.string().min(2, 'Short name must be at least 2 characters').max(4, 'Short name must be at most 4 characters'),
  description: z.string().optional(),
  currencyCode: z.string().length(3, 'Currency code must be 3 characters (ISO 4217)'),
  digitsAfterDecimal: z.number().min(0).max(6),
  inMultiplesOf: z.number().positive().optional(),
});

// Step 2: Terms
export const loanProductTermsSchema = z.object({
  principal: z.number().positive('Principal amount must be greater than 0'),
  minPrincipal: z.number().positive().optional(),
  maxPrincipal: z.number().positive().optional(),
  numberOfRepayments: z.number().positive('Number of repayments must be greater than 0'),
  minNumberOfRepayments: z.number().positive().optional(),
  maxNumberOfRepayments: z.number().positive().optional(),
  repaymentEvery: z.number().positive('Repayment frequency must be greater than 0'),
  repaymentFrequencyType: z.number().min(0).max(3), // 0=Days, 1=Weeks, 2=Months, 3=Years
});

// Step 3: Interest
export const loanProductInterestSchema = z.object({
  interestRatePerPeriod: z.number().min(0, 'Interest rate cannot be negative'),
  minInterestRatePerPeriod: z.number().min(0).optional(),
  maxInterestRatePerPeriod: z.number().min(0).optional(),
  interestRateFrequencyType: z.number().min(2).max(3), // 2=Per month, 3=Per year
  interestType: z.number().min(0).max(1), // 0=Declining Balance, 1=Flat
  interestCalculationPeriodType: z.number().min(0).max(1), // 0=Daily, 1=Same as repayment period
  amortizationType: z.number().min(0).max(1), // 0=Equal principal payments, 1=Equal installments
  isInterestRecalculationEnabled: z.boolean().default(false),
});

// Step 4: Settings
export const loanProductSettingsSchema = z.object({
  transactionProcessingStrategyCode: z.string().min(1, 'Transaction processing strategy is required'),
  graceOnPrincipalPayment: z.number().min(0).optional(),
  graceOnInterestPayment: z.number().min(0).optional(),
  graceOnArrearsAgeing: z.number().min(0).optional(),
  inArrearsTolerance: z.number().min(0).optional(),
});

// Step 5: Accounting
export const loanProductAccountingSchema = z.object({
  accountingRule: z.number().min(1).max(4), // 1=None, 2=Cash, 3=Accrual (periodic), 4=Accrual (upfront)
  daysInYearType: z.number().min(1).max(4), // 1=Actual, 2=360, 3=364, 4=365
  daysInMonthType: z.number().min(1).max(3), // 1=Actual, 2=30, 3=Invalid
});

// Combined schema for full loan product
export const createLoanProductSchema = loanProductBasicsSchema
  .merge(loanProductTermsSchema)
  .merge(loanProductInterestSchema)
  .merge(loanProductSettingsSchema)
  .merge(loanProductAccountingSchema);

export type LoanProductBasicsFormData = z.infer<typeof loanProductBasicsSchema>;
export type LoanProductTermsFormData = z.infer<typeof loanProductTermsSchema>;
export type LoanProductInterestFormData = z.infer<typeof loanProductInterestSchema>;
export type LoanProductSettingsFormData = z.infer<typeof loanProductSettingsSchema>;
export type LoanProductAccountingFormData = z.infer<typeof loanProductAccountingSchema>;
export type CreateLoanProductFormData = z.infer<typeof createLoanProductSchema>;

/**
 * Converts form data to API request format
 */
export function loanProductFormToRequest(data: CreateLoanProductFormData) {
  return {
    name: data.name,
    shortName: data.shortName,
    description: data.description,
    currencyCode: data.currencyCode,
    digitsAfterDecimal: data.digitsAfterDecimal,
    inMultiplesOf: data.inMultiplesOf || 0,
    principal: data.principal,
    minPrincipal: data.minPrincipal,
    maxPrincipal: data.maxPrincipal,
    numberOfRepayments: data.numberOfRepayments,
    minNumberOfRepayments: data.minNumberOfRepayments,
    maxNumberOfRepayments: data.maxNumberOfRepayments,
    repaymentEvery: data.repaymentEvery,
    repaymentFrequencyType: data.repaymentFrequencyType,
    interestRatePerPeriod: data.interestRatePerPeriod,
    minInterestRatePerPeriod: data.minInterestRatePerPeriod,
    maxInterestRatePerPeriod: data.maxInterestRatePerPeriod,
    interestRateFrequencyType: data.interestRateFrequencyType,
    interestType: data.interestType,
    interestCalculationPeriodType: data.interestCalculationPeriodType,
    amortizationType: data.amortizationType,
    isInterestRecalculationEnabled: data.isInterestRecalculationEnabled,
    transactionProcessingStrategyCode: data.transactionProcessingStrategyCode,
    graceOnPrincipalPayment: data.graceOnPrincipalPayment,
    graceOnInterestPayment: data.graceOnInterestPayment,
    graceOnArrearsAgeing: data.graceOnArrearsAgeing,
    inArrearsTolerance: data.inArrearsTolerance,
    accountingRule: data.accountingRule,
    daysInYearType: data.daysInYearType,
    daysInMonthType: data.daysInMonthType,
    locale: 'en',
  };
}
