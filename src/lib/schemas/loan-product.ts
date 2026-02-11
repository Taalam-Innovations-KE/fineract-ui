import { z } from "zod";

const coerceNaNToUndefined = (value: unknown) =>
	typeof value === "number" && Number.isNaN(value) ? undefined : value;

const optionalNumber = z.preprocess(
	coerceNaNToUndefined,
	z.number().nonnegative().optional(),
);
const optionalPositiveInteger = z.preprocess(
	coerceNaNToUndefined,
	z.number().int().positive().optional(),
);

export const feeChargeFormSchema = z.object({
	name: z.string().min(2, "Fee name is required"),
	calculationMethod: z.enum(["flat", "percent"]),
	amount: z.number().positive("Amount must be greater than 0"),
	chargeTimeType: z.enum(["disbursement", "specifiedDueDate", "approval"]),
	paymentMode: z.enum(["deduct", "payable"]),
	currencyCode: z.string().length(3, "Currency code must be 3 characters"),
});

export const penaltyChargeFormSchema = z
	.object({
		name: z.string().min(2, "Penalty name is required"),
		penaltyBasis: z.enum([
			"totalOverdue",
			"overduePrincipal",
			"overdueInterest",
		]),
		calculationMethod: z.enum(["flat", "percent"]),
		amount: z.number().positive("Amount must be greater than 0"),
		gracePeriodOverride: optionalNumber,
		currencyCode: z.string().length(3, "Currency code must be 3 characters"),
		frequencyType: z.enum(["days", "weeks", "months", "years"]).optional(),
		frequencyInterval: optionalPositiveInteger,
	})
	.superRefine((data, ctx) => {
		const hasFrequencyType = Boolean(data.frequencyType);
		const hasFrequencyInterval = data.frequencyInterval !== undefined;

		if (hasFrequencyType && !hasFrequencyInterval) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["frequencyInterval"],
				message: "Frequency interval is required when frequency type is set",
			});
		}

		if (!hasFrequencyType && hasFrequencyInterval) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["frequencyType"],
				message: "Frequency type is required when frequency interval is set",
			});
		}
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
	gracePeriodOverride: optionalNumber,
	currencyCode: z.string().optional(),
	frequencyType: z.enum(["days", "weeks", "months", "years"]).optional(),
	frequencyInterval: optionalPositiveInteger,
});

const reasonToExpenseMappingSchema = z.object({
	reasonCodeValueId: z.number().int().positive(),
	expenseAccountId: z.number().int().positive(),
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
	includeInBorrowerCycle: z.boolean().optional(),
	useBorrowerCycle: z.boolean().optional(),
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
		repaymentStartDateType: z.number().int().positive().optional(),
		loanScheduleType: z.string().optional(),
		loanScheduleProcessingType: z.string().optional(),
		multiDisburseLoan: z.boolean().optional(),
		maxTrancheCount: z.number().int().min(2).optional(),
		disallowExpectedDisbursements: z.boolean().optional(),
		allowFullTermForTranche: z.boolean().optional(),
		syncExpectedWithDisbursementDate: z.boolean().optional(),
		allowApprovedDisbursedAmountsOverApplied: z.boolean().optional(),
		overAppliedCalculationType: z.enum(["flat", "percentage"]).optional(),
		overAppliedNumber: optionalNumber,
		graceOnPrincipalPayment: optionalNumber,
		graceOnInterestPayment: optionalNumber,
		principalThresholdForLastInstallment: optionalNumber,
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

		if (data.multiDisburseLoan && !data.maxTrancheCount) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxTrancheCount"],
				message:
					"Max tranche count is required when multi-disbursement is enabled",
			});
		}

		if (data.allowFullTermForTranche && !data.multiDisburseLoan) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["allowFullTermForTranche"],
				message: "Enable multi-disbursement before allowing full-term tranches",
			});
		}

		if (data.allowApprovedDisbursedAmountsOverApplied) {
			if (!data.overAppliedCalculationType) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["overAppliedCalculationType"],
					message:
						"Select calculation type when over-applied disbursal is enabled",
				});
			}

			if (data.overAppliedNumber === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["overAppliedNumber"],
					message: "Enter a limit value when over-applied disbursal is enabled",
				});
			}
		}
	});

// Step 4: Interest & Calculation Rules
export const loanProductInterestSchema = z
	.object({
		interestType: z.number().min(0),
		amortizationType: z.number().min(0),
		interestRatePerPeriod: z
			.number()
			.positive("Interest rate must be greater than 0"),
		interestRateFrequencyType: z.number().min(0),
		interestCalculationPeriodType: z.number().min(0),
		allowPartialPeriodInterestCalculation: z.boolean().optional(),
		daysInYearType: z
			.number()
			.refine((val) => [1, 360, 364, 365].includes(val), {
				message: "Days in year must be 1 (Actual), 360, 364, or 365",
			}),
		daysInMonthType: z.number().refine((val) => [1, 30].includes(val), {
			message: "Days in month must be 1 (Actual) or 30",
		}),
		isInterestRecalculationEnabled: z.boolean(),
		interestRecalculationCompoundingMethod: z.number().min(0).optional(),
		rescheduleStrategyMethod: z.number().min(0).optional(),
		preClosureInterestCalculationStrategy: z.number().min(0).optional(),
		isArrearsBasedOnOriginalSchedule: z.boolean().optional(),
		disallowInterestCalculationOnPastDue: z.boolean().optional(),
		recalculationCompoundingFrequencyType: z.number().min(0).optional(),
		recalculationCompoundingFrequencyInterval: optionalPositiveInteger,
		recalculationCompoundingFrequencyOnDayType: z
			.number()
			.int()
			.min(1)
			.max(31)
			.optional(),
		recalculationRestFrequencyType: z.number().min(0).optional(),
		recalculationRestFrequencyInterval: optionalPositiveInteger,
	})
	.superRefine((data, ctx) => {
		if (!data.isInterestRecalculationEnabled) {
			return;
		}

		if (data.interestRecalculationCompoundingMethod === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["interestRecalculationCompoundingMethod"],
				message: "Compounding method is required when recalculation is enabled",
			});
		}

		if (data.rescheduleStrategyMethod === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["rescheduleStrategyMethod"],
				message:
					"Reschedule strategy is required when recalculation is enabled",
			});
		}

		if (data.preClosureInterestCalculationStrategy === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["preClosureInterestCalculationStrategy"],
				message:
					"Pre-closure strategy is required when recalculation is enabled",
			});
		}

		if (data.recalculationRestFrequencyType === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["recalculationRestFrequencyType"],
				message:
					"Rest frequency type is required when recalculation is enabled",
			});
		}

		if (data.recalculationRestFrequencyInterval === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["recalculationRestFrequencyInterval"],
				message:
					"Rest frequency interval is required when recalculation is enabled",
			});
		}

		if (
			data.interestRecalculationCompoundingMethod !== undefined &&
			data.interestRecalculationCompoundingMethod !== 0
		) {
			if (data.recalculationCompoundingFrequencyType === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["recalculationCompoundingFrequencyType"],
					message:
						"Compounding frequency type is required for non-none compounding",
				});
			}

			if (data.recalculationCompoundingFrequencyInterval === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["recalculationCompoundingFrequencyInterval"],
					message:
						"Compounding frequency interval is required for non-none compounding",
				});
			}

			if (
				data.recalculationCompoundingFrequencyType === 4 &&
				data.recalculationCompoundingFrequencyOnDayType === undefined
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["recalculationCompoundingFrequencyOnDayType"],
					message:
						"Compounding day of month is required for monthly compounding",
				});
			}
		}
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
		delinquencyBucketId: z.number().int().positive().optional(),
		accountMovesOutOfNPAOnlyOnArrearsCompletion: z.boolean().optional(),
		enableIncomeCapitalization: z.boolean().optional(),
		capitalizedIncomeType: z.enum(["FEE", "INTEREST"]).optional(),
		capitalizedIncomeCalculationType: z.enum(["FLAT"]).optional(),
		capitalizedIncomeStrategy: z.enum(["EQUAL_AMORTIZATION"]).optional(),
		enableBuyDownFee: z.boolean().optional(),
		buyDownFeeIncomeType: z.enum(["FEE", "INTEREST"]).optional(),
		buyDownFeeCalculationType: z.enum(["FLAT"]).optional(),
		buyDownFeeStrategy: z.enum(["EQUAL_AMORTIZATION"]).optional(),
		merchantBuyDownFee: z.boolean().optional(),
		chargeOffBehaviour: z
			.enum(["REGULAR", "ZERO_INTEREST", "ACCELERATE_MATURITY"])
			.optional(),
		chargeOffReasonToExpenseMappings: z
			.array(reasonToExpenseMappingSchema)
			.default([]),
		writeOffReasonToExpenseMappings: z
			.array(reasonToExpenseMappingSchema)
			.default([]),
		supportedInterestRefundTypes: z.array(z.string()).default([]),
		paymentAllocationTransactionTypes: z.array(z.string()).default([]),
		paymentAllocationRules: z.array(z.string()).default([]),
		paymentAllocationFutureInstallmentAllocationRule: z.string().optional(),
		creditAllocationTransactionTypes: z.array(z.string()).default([]),
		creditAllocationRules: z.array(z.string()).default([]),
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
		if (data.enableIncomeCapitalization) {
			if (!data.capitalizedIncomeType) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["capitalizedIncomeType"],
					message: "Capitalized income type is required when enabled",
				});
			}
			if (!data.capitalizedIncomeCalculationType) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["capitalizedIncomeCalculationType"],
					message:
						"Capitalized income calculation type is required when enabled",
				});
			}
			if (!data.capitalizedIncomeStrategy) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["capitalizedIncomeStrategy"],
					message: "Capitalized income strategy is required when enabled",
				});
			}
		}

		if (data.enableBuyDownFee) {
			if (!data.buyDownFeeIncomeType) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["buyDownFeeIncomeType"],
					message: "Buy-down fee income type is required when enabled",
				});
			}
			if (!data.buyDownFeeCalculationType) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["buyDownFeeCalculationType"],
					message: "Buy-down fee calculation type is required when enabled",
				});
			}
			if (!data.buyDownFeeStrategy) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["buyDownFeeStrategy"],
					message: "Buy-down fee strategy is required when enabled",
				});
			}
		}

		if (
			data.paymentAllocationTransactionTypes.length > 0 &&
			data.paymentAllocationRules.length === 0
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["paymentAllocationRules"],
				message: "Select at least one payment allocation rule",
			});
		}

		if (
			data.paymentAllocationRules.length > 0 &&
			data.paymentAllocationTransactionTypes.length === 0
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["paymentAllocationTransactionTypes"],
				message: "Select at least one payment transaction type",
			});
		}

		if (
			data.paymentAllocationTransactionTypes.length > 0 &&
			!data.paymentAllocationFutureInstallmentAllocationRule
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["paymentAllocationFutureInstallmentAllocationRule"],
				message: "Select a future installment allocation rule",
			});
		}

		if (
			data.creditAllocationTransactionTypes.length > 0 &&
			data.creditAllocationRules.length === 0
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["creditAllocationRules"],
				message: "Select at least one credit allocation rule",
			});
		}

		if (
			data.creditAllocationRules.length > 0 &&
			data.creditAllocationTransactionTypes.length === 0
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["creditAllocationTransactionTypes"],
				message: "Select at least one credit transaction type",
			});
		}

		if (!data.accountingRule || data.accountingRule === 1) {
			return;
		}

		// Base accounts required for all non-NONE accounting (2, 3, 4)
		const requiredBase = [
			"fundSourceAccountId",
			"loanPortfolioAccountId",
			"interestOnLoanAccountId",
			"incomeFromFeeAccountId",
			"incomeFromPenaltyAccountId",
			"writeOffAccountId",
			// Fineract requires these for all accounting types
			"transfersInSuspenseAccountId",
			"overpaymentLiabilityAccountId",
			"incomeFromRecoveryAccountId",
		] as const;

		for (const field of requiredBase) {
			if (!data[field]) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [field],
					message: "Required when accounting is enabled",
				});
			}
		}

		// Additional receivable accounts for accrual accounting (3, 4)
		if (data.accountingRule === 3 || data.accountingRule === 4) {
			const requiredAccrual = [
				"receivableInterestAccountId",
				"receivableFeeAccountId",
				"receivablePenaltyAccountId",
			] as const;

			for (const field of requiredAccrual) {
				if (!data[field]) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: [field],
						message: "Required for accrual accounting",
					});
				}
			}
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
