import { z } from "zod";

const optionalNumber = z.number().nonnegative().optional();

export const feeChargeFormSchema = z.object({
	name: z.string().min(2, "Fee name is required"),
	calculationMethod: z.enum(["flat", "percent"]),
	amount: z.number().positive("Amount must be greater than 0"),
	chargeTimeType: z.enum(["disbursement", "specifiedDueDate", "approval"]),
	paymentMode: z.enum(["deduct", "payable"]),
	currencyCode: z.string().length(3, "Currency code must be 3 characters"),
});

export const penaltyChargeFormSchema = z.object({
	name: z.string().min(2, "Penalty name is required"),
	penaltyBasis: z.enum(["totalOverdue", "overduePrincipal", "overdueInterest"]),
	calculationMethod: z.enum(["flat", "percent"]),
	amount: z.number().positive("Amount must be greater than 0"),
	gracePeriodOverride: optionalNumber,
	currencyCode: z.string().length(3, "Currency code must be 3 characters"),
});

export const feeSelectionSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	amount: z.number().optional(),
	calculationMethod: z.enum(["flat", "percent"]).optional(),
	chargeTimeType: z
		.enum(["disbursement", "specifiedDueDate", "approval"])
		.optional(),
	paymentMode: z.enum(["deduct", "payable"]).optional(),
	currencyCode: z.string().optional(),
});

export const penaltySelectionSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	amount: z.number().optional(),
	calculationMethod: z.enum(["flat", "percent"]).optional(),
	penaltyBasis: z
		.enum(["totalOverdue", "overduePrincipal", "overdueInterest"])
		.optional(),
	currencyCode: z.string().optional(),
});

// Step 1: Identity & Currency
export const loanProductIdentitySchema = z.object({
	name: z.string().min(3, "Product name must be at least 3 characters"),
	shortName: z
		.string()
		.min(1, "Short name is required")
		.max(4, "Short name must be at most 4 characters"),
	description: z.string().optional(),
	currencyCode: z
		.string()
		.length(3, "Currency code must be 3 characters (ISO 4217)"),
	digitsAfterDecimal: z.number().min(0).max(6),
});

// Step 2: Loan Amount Rules
export const loanProductAmountSchema = z
	.object({
		minPrincipal: z
			.number()
			.positive("Minimum principal must be greater than 0"),
		principal: z.number().positive("Principal must be greater than 0"),
		maxPrincipal: z
			.number()
			.positive("Maximum principal must be greater than 0"),
		inMultiplesOf: z
			.number()
			.positive("Multiples of must be greater than 0")
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.minPrincipal > data.principal) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["minPrincipal"],
				message:
					"Minimum principal must be less than or equal to the default principal",
			});
		}

		if (data.principal > data.maxPrincipal) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxPrincipal"],
				message:
					"Maximum principal must be greater than or equal to the default principal",
			});
		}
	});

// Step 3: Tenure & Repayment Schedule
export const loanProductScheduleSchema = z
	.object({
		minNumberOfRepayments: z
			.number()
			.positive("Minimum repayments must be greater than 0"),
		numberOfRepayments: z
			.number()
			.positive("Number of repayments must be greater than 0"),
		maxNumberOfRepayments: z
			.number()
			.positive("Maximum repayments must be greater than 0"),
		repaymentEvery: z
			.number()
			.positive("Repayment frequency must be greater than 0"),
		repaymentFrequencyType: z.number().min(0),
		minimumDaysBetweenDisbursalAndFirstRepayment: optionalNumber,
	})
	.superRefine((data, ctx) => {
		if (data.minNumberOfRepayments > data.numberOfRepayments) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["minNumberOfRepayments"],
				message:
					"Minimum repayments must be less than or equal to the default repayments",
			});
		}

		if (data.numberOfRepayments > data.maxNumberOfRepayments) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxNumberOfRepayments"],
				message:
					"Maximum repayments must be greater than or equal to the default repayments",
			});
		}
	});

// Step 4: Interest & Calculation Rules
export const loanProductInterestSchema = z.object({
	interestType: z.number().min(0),
	amortizationType: z.number().min(0),
	interestRatePerPeriod: z
		.number()
		.positive("Interest rate must be greater than 0"),
	interestRateFrequencyType: z.number().min(0),
	interestCalculationPeriodType: z.number().min(0),
	allowPartialPeriodInterestCalculation: z.boolean().optional(),
});

// Step 5: Fees
export const loanProductFeesSchema = z.object({
	fees: z.array(feeSelectionSchema).default([]),
});

// Step 6: Penalties
export const loanProductPenaltiesSchema = z.object({
	penalties: z.array(penaltySelectionSchema).default([]),
});

// Step 7: Delinquency, Accounting & Waterfall
export const loanProductAccountingSchema = z
	.object({
		transactionProcessingStrategyCode: z
			.string()
			.min(1, "Repayment waterfall strategy is required"),
		graceOnArrearsAgeing: optionalNumber,
		inArrearsTolerance: optionalNumber,
		overdueDaysForNPA: optionalNumber,
		accountingRule: z.number().min(1),
		fundSourceAccountId: z.number().int().optional(),
		loanPortfolioAccountId: z.number().int().optional(),
		interestOnLoanAccountId: z.number().int().optional(),
		incomeFromFeeAccountId: z.number().int().optional(),
		incomeFromPenaltyAccountId: z.number().int().optional(),
		writeOffAccountId: z.number().int().optional(),
		receivableInterestAccountId: z.number().int().optional(),
		receivableFeeAccountId: z.number().int().optional(),
		receivablePenaltyAccountId: z.number().int().optional(),
		incomeFromRecoveryAccountId: z.number().int().optional(),
		overpaymentLiabilityAccountId: z.number().int().optional(),
		transfersInSuspenseAccountId: z.number().int().optional(),
	})
	.superRefine((data, ctx) => {
		if (!data.accountingRule || data.accountingRule === 1) {
			return;
		}

		const requiredBase = [
			"fundSourceAccountId",
			"loanPortfolioAccountId",
			"interestOnLoanAccountId",
			"incomeFromFeeAccountId",
			"incomeFromPenaltyAccountId",
			"writeOffAccountId",
		] as const;

		requiredBase.forEach((field) => {
			if (!data[field]) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [field],
					message: "Required when accounting is enabled",
				});
			}
		});

		if (data.accountingRule === 3 || data.accountingRule === 4) {
			const requiredAccrual = [
				"receivableInterestAccountId",
				"receivableFeeAccountId",
				"receivablePenaltyAccountId",
				"overpaymentLiabilityAccountId",
				"transfersInSuspenseAccountId",
			] as const;

			requiredAccrual.forEach((field) => {
				if (!data[field]) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: [field],
						message: "Required for accrual accounting",
					});
				}
			});
		}
	});

export const createLoanProductSchema = loanProductIdentitySchema
	.merge(loanProductAmountSchema)
	.merge(loanProductScheduleSchema)
	.merge(loanProductInterestSchema)
	.merge(loanProductFeesSchema)
	.merge(loanProductPenaltiesSchema)
	.merge(loanProductAccountingSchema);

export type LoanProductIdentityFormData = z.infer<
	typeof loanProductIdentitySchema
>;
export type LoanProductAmountFormData = z.infer<typeof loanProductAmountSchema>;
export type LoanProductScheduleFormData = z.infer<
	typeof loanProductScheduleSchema
>;
export type LoanProductInterestFormData = z.infer<
	typeof loanProductInterestSchema
>;
export type LoanProductFeesFormData = z.infer<typeof loanProductFeesSchema>;
export type LoanProductPenaltiesFormData = z.infer<
	typeof loanProductPenaltiesSchema
>;
export type LoanProductAccountingFormData = z.infer<
	typeof loanProductAccountingSchema
>;
export type CreateLoanProductFormData = z.infer<typeof createLoanProductSchema>;
export type FeeFormData = z.infer<typeof feeChargeFormSchema>;
export type PenaltyFormData = z.infer<typeof penaltyChargeFormSchema>;
export type FeeSelection = z.infer<typeof feeSelectionSchema>;
export type PenaltySelection = z.infer<typeof penaltySelectionSchema>;
