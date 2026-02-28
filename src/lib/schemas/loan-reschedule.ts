import { z } from "zod";

export const loanRescheduleRequestSchema = z
	.object({
		loanId: z.number().int().positive("Loan ID is required"),
		submittedOnDate: z.string().min(1, "Submitted on date is required"),
		rescheduleFromDate: z.string().min(1, "Reschedule from date is required"),
		rescheduleFromInstallment: z.number().int().positive().optional(),
		adjustedDueDate: z.string().optional(),
		graceOnPrincipal: z.number().int().positive().optional(),
		graceOnInterest: z.number().int().positive().optional(),
		extraTerms: z.number().int().positive().optional(),
		newInterestRate: z.number().min(0).optional(),
		emi: z.number().positive().optional(),
		endDate: z.string().optional(),
		rescheduleReasonId: z
			.number()
			.int()
			.positive("Reschedule reason is required"),
		rescheduleReasonComment: z.string().max(500).optional(),
		recalculateInterest: z.boolean().optional(),
		dateFormat: z.string().default("dd MMMM yyyy"),
		locale: z.string().default("en"),
	})
	.superRefine((data, ctx) => {
		const hasAnyChange = [
			data.graceOnPrincipal !== undefined,
			data.graceOnInterest !== undefined,
			data.extraTerms !== undefined,
			data.newInterestRate !== undefined,
			Boolean(data.adjustedDueDate),
			data.emi !== undefined,
		].some(Boolean);

		if (!hasAnyChange) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["rescheduleFromDate"],
				message:
					"Provide at least one change (grace, extra terms, interest rate, adjusted due date, or EMI).",
			});
		}

		if (data.adjustedDueDate && data.rescheduleFromDate) {
			const adjusted = new Date(data.adjustedDueDate);
			const fromDate = new Date(data.rescheduleFromDate);
			if (
				!Number.isNaN(adjusted.getTime()) &&
				!Number.isNaN(fromDate.getTime())
			) {
				if (adjusted.getTime() < fromDate.getTime()) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["adjustedDueDate"],
						message:
							"Adjusted due date must be on or after reschedule from date.",
					});
				}
			}
		}

		const hasEmi = data.emi !== undefined;
		const hasEndDate = Boolean(data.endDate);
		if (hasEmi !== hasEndDate) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["emi"],
				message: "EMI and end date must be provided together.",
			});
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["endDate"],
				message: "EMI and end date must be provided together.",
			});
		}
	});

export const loanRescheduleDecisionSchema = z.object({
	action: z.enum(["approve", "reject"]),
	actionDate: z.string().min(1, "Action date is required"),
	dateFormat: z.string().default("dd MMMM yyyy"),
	locale: z.string().default("en"),
});

export type LoanRescheduleRequestInput = z.input<
	typeof loanRescheduleRequestSchema
>;
export type LoanRescheduleDecisionInput = z.input<
	typeof loanRescheduleDecisionSchema
>;
