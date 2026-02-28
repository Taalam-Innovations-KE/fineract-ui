import { z } from "zod";
import type { GetLoanProductsProductIdResponse } from "@/lib/fineract/generated/types.gen";

/**
 * Step 1: Client & Product Selection
 */
export const loanClientProductSchema = z.object({
	clientId: z.number().int().positive("Client is required"),
	productId: z.number().int().positive("Loan product is required"),
});

/**
 * Step 2: Loan Terms
 * Validation is dynamic based on product constraints
 */
export const loanTermsSchema = z.object({
	principal: z.number().positive("Principal is required"),
	numberOfRepayments: z
		.number()
		.int()
		.positive("Number of repayments is required"),
	interestRatePerPeriod: z.number().min(0).optional(),
	loanTermFrequency: z.number().int().positive().optional(),
	loanTermFrequencyType: z.number().int().min(0).optional(),
	repaymentEvery: z.number().int().positive().optional(),
	repaymentFrequencyType: z.number().int().min(0).optional(),
});

/**
 * Step 3: Charges Selection
 * Selected from product's available charges
 */
export const loanChargeSelectionSchema = z.object({
	chargeId: z.number().int(),
	amount: z.number().positive().optional(),
	dueDate: z.string().optional(),
});

export const loanChargesSchema = z.object({
	charges: z.array(loanChargeSelectionSchema).default([]),
});

/**
 * Step 4: Grace Periods
 */
export const loanGracePeriodsSchema = z.object({
	graceOnPrincipalPayment: z.number().int().min(0).optional(),
	graceOnInterestPayment: z.number().int().min(0).optional(),
	graceOnInterestCharged: z.number().int().min(0).optional(),
	graceOnArrearsAgeing: z.number().int().min(0).optional(),
});

/**
 * Step 5: Advanced Features
 * Only relevant if product enables these features
 */
export const loanAdvancedSchema = z
	.object({
		enableDownPayment: z.boolean().optional(),
		disbursedAmountPercentageForDownPayment: z
			.number()
			.min(0)
			.max(100)
			.optional(),
		enableAutoRepaymentForDownPayment: z.boolean().optional(),
		isMultiTrancheEnabled: z.boolean().optional(),
		maxOutstandingLoanBalance: z.number().positive().optional(),
		disbursementData: z
			.array(
				z.object({
					principal: z.number().positive(),
					expectedDisbursementDate: z.string(),
				}),
			)
			.optional(),
		isTopup: z.boolean().optional(),
		loanIdToClose: z.number().int().positive().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.isTopup && !data.loanIdToClose) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["loanIdToClose"],
				message: "Select the active loan to close for top-up",
			});
		}
	});

/**
 * Step 6: Dates & External Reference
 */
export const loanDatesSchema = z.object({
	submittedOnDate: z.string().min(1, "Submission date is required"),
	expectedDisbursementDate: z
		.string()
		.min(1, "Expected disbursement date is required"),
	repaymentsStartingFromDate: z.string().optional(),
	interestChargedFromDate: z.string().optional(),
	externalId: z.string().max(100).optional(),
});

/**
 * Step fields mapping for partial validation
 */
export const LOAN_STEP_FIELDS: Record<number, string[]> = {
	0: ["clientId", "productId"],
	1: [
		"principal",
		"numberOfRepayments",
		"interestRatePerPeriod",
		"loanTermFrequency",
		"loanTermFrequencyType",
		"repaymentEvery",
		"repaymentFrequencyType",
	],
	2: ["charges"],
	3: [
		"graceOnPrincipalPayment",
		"graceOnInterestPayment",
		"graceOnInterestCharged",
		"graceOnArrearsAgeing",
	],
	4: [
		"enableDownPayment",
		"disbursedAmountPercentageForDownPayment",
		"enableAutoRepaymentForDownPayment",
		"isMultiTrancheEnabled",
		"maxOutstandingLoanBalance",
		"disbursementData",
		"isTopup",
		"loanIdToClose",
	],
	5: [
		"submittedOnDate",
		"expectedDisbursementDate",
		"repaymentsStartingFromDate",
		"interestChargedFromDate",
		"externalId",
	],
};

/**
 * Base loan application schema (without dynamic product constraints)
 */
export const baseLoanApplicationSchema = loanClientProductSchema
	.merge(loanTermsSchema)
	.merge(loanChargesSchema)
	.merge(loanGracePeriodsSchema)
	.merge(loanAdvancedSchema)
	.merge(loanDatesSchema);

/**
 * Factory function to create a loan application schema with product constraints
 */
export function createLoanApplicationSchema(
	product?: GetLoanProductsProductIdResponse | null,
) {
	const schema = baseLoanApplicationSchema;

	if (!product) {
		return schema;
	}

	// Add principal constraints from product
	return schema.superRefine((data, ctx) => {
		// Validate principal against product limits
		if (product.minPrincipal && data.principal < product.minPrincipal) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["principal"],
				message: `Minimum principal is ${product.minPrincipal.toLocaleString()}`,
			});
		}
		if (product.maxPrincipal && data.principal > product.maxPrincipal) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["principal"],
				message: `Maximum principal is ${product.maxPrincipal.toLocaleString()}`,
			});
		}

		// Validate number of repayments
		if (
			product.minNumberOfRepayments &&
			data.numberOfRepayments < product.minNumberOfRepayments
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["numberOfRepayments"],
				message: `Minimum repayments is ${product.minNumberOfRepayments}`,
			});
		}
		if (
			product.maxNumberOfRepayments &&
			data.numberOfRepayments > product.maxNumberOfRepayments
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["numberOfRepayments"],
				message: `Maximum repayments is ${product.maxNumberOfRepayments}`,
			});
		}

		// Validate interest rate
		if (
			product.minInterestRatePerPeriod !== undefined &&
			data.interestRatePerPeriod !== undefined &&
			data.interestRatePerPeriod < product.minInterestRatePerPeriod
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["interestRatePerPeriod"],
				message: `Minimum interest rate is ${product.minInterestRatePerPeriod}%`,
			});
		}
		if (
			product.maxInterestRatePerPeriod !== undefined &&
			data.interestRatePerPeriod !== undefined &&
			data.interestRatePerPeriod > product.maxInterestRatePerPeriod
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["interestRatePerPeriod"],
				message: `Maximum interest rate is ${product.maxInterestRatePerPeriod}%`,
			});
		}
	});
}

// Type exports
export type LoanClientProductInput = z.infer<typeof loanClientProductSchema>;
export type LoanTermsInput = z.infer<typeof loanTermsSchema>;
export type LoanChargeSelection = z.infer<typeof loanChargeSelectionSchema>;
export type LoanChargesInput = z.infer<typeof loanChargesSchema>;
export type LoanGracePeriodsInput = z.infer<typeof loanGracePeriodsSchema>;
export type LoanAdvancedInput = z.infer<typeof loanAdvancedSchema>;
export type LoanDatesInput = z.infer<typeof loanDatesSchema>;
export type LoanApplicationInput = z.infer<typeof baseLoanApplicationSchema>;
