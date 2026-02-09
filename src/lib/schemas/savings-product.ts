import { z } from "zod";

const coerceNaNToUndefined = (value: unknown) =>
	typeof value === "number" && Number.isNaN(value) ? undefined : value;

const optionalNumber = z.preprocess(
	coerceNaNToUndefined,
	z.number().int().nonnegative().optional(),
);

const optionalAccountId = z.preprocess(
	coerceNaNToUndefined,
	z.number().int().positive().optional(),
);

export const savingsProductSchema = z
	.object({
		name: z.string().min(3, "Product name must be at least 3 characters"),
		shortName: z
			.string()
			.min(1, "Short name is required")
			.max(4, "Short name must be at most 4 characters"),
		description: z.string().min(3, "Description is required"),
		currencyCode: z.string().length(3, "Currency code must be 3 characters"),
		digitsAfterDecimal: z.number().int().min(0).max(6),
		inMultiplesOf: z
			.number()
			.int()
			.positive("In multiples of must be positive"),
		nominalAnnualInterestRate: z
			.number()
			.nonnegative("Nominal annual interest rate must be 0 or greater"),
		interestCompoundingPeriodType: z.number().int().positive(),
		interestPostingPeriodType: z.number().int().positive(),
		interestCalculationType: z.number().int().positive(),
		interestCalculationDaysInYearType: z.number().int().positive(),
		accountingRule: z.number().int().positive(),
		withdrawalFeeForTransfers: z.boolean().default(false),
		withHoldTax: z.boolean().default(false),
		allowOverdraft: z.boolean().default(false),
		isDormancyTrackingActive: z.boolean().default(false),
		lockinPeriodFrequency: optionalNumber,
		lockinPeriodFrequencyType: optionalNumber,
		charges: z.array(z.number().int().positive()).default([]),
		savingsReferenceAccountId: optionalAccountId,
		savingsControlAccountId: optionalAccountId,
		interestOnSavingsAccountId: optionalAccountId,
		incomeFromFeeAccountId: optionalAccountId,
		transfersInSuspenseAccountId: optionalAccountId,
		incomeFromPenaltyAccountId: optionalAccountId,
		overdraftPortfolioControlId: optionalAccountId,
		incomeFromInterestId: optionalAccountId,
		writeOffAccountId: optionalAccountId,
		feesReceivableAccountId: optionalAccountId,
		penaltiesReceivableAccountId: optionalAccountId,
		interestPayableAccountId: optionalAccountId,
	})
	.superRefine((data, ctx) => {
		if (
			(data.lockinPeriodFrequency === undefined) !==
			(data.lockinPeriodFrequencyType === undefined)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["lockinPeriodFrequency"],
				message:
					"Lock-in period and lock-in frequency type must be set together",
			});
		}

		const requiresCashMappings = data.accountingRule >= 2;
		if (requiresCashMappings) {
			const requiredCashFields: Array<keyof typeof data> = [
				"savingsReferenceAccountId",
				"savingsControlAccountId",
				"interestOnSavingsAccountId",
				"incomeFromFeeAccountId",
				"transfersInSuspenseAccountId",
				"incomeFromPenaltyAccountId",
				"overdraftPortfolioControlId",
				"incomeFromInterestId",
				"writeOffAccountId",
			];

			for (const field of requiredCashFields) {
				if (data[field] === undefined) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: [field],
						message: "This accounting mapping is required",
					});
				}
			}
		}

		const requiresAccrualMappings = data.accountingRule >= 3;
		if (requiresAccrualMappings) {
			const requiredAccrualFields: Array<keyof typeof data> = [
				"feesReceivableAccountId",
				"penaltiesReceivableAccountId",
				"interestPayableAccountId",
			];

			for (const field of requiredAccrualFields) {
				if (data[field] === undefined) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: [field],
						message: "This accrual mapping is required",
					});
				}
			}
		}
	});

export type SavingsProductFormData = z.infer<typeof savingsProductSchema>;
