import { z } from "zod";

export const loanApprovalSchema = z
	.object({
		approvedOnDate: z.string().min(1, "Approval date is required"),
		approvedLoanAmount: z
			.number()
			.positive("Approved amount must be positive")
			.optional(),
		expectedDisbursementDate: z.string().optional(),
		dateFormat: z.string().default("dd MMMM yyyy"),
		locale: z.string().default("en"),
		note: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.expectedDisbursementDate && data.approvedOnDate) {
				return data.expectedDisbursementDate >= data.approvedOnDate;
			}
			return true;
		},
		{
			message:
				"Expected disbursement date must be on or after the approval date",
			path: ["expectedDisbursementDate"],
		},
	);

export const loanDisbursementSchema = z.object({
	actualDisbursementDate: z.string().min(1, "Disbursement date is required"),
	transactionAmount: z
		.number()
		.positive("Transaction amount must be positive")
		.optional(),
	fixedEmiAmount: z
		.number()
		.positive("Fixed EMI amount must be positive")
		.optional(),
	dateFormat: z.string().default("dd MMMM yyyy"),
	locale: z.string().default("en"),
	paymentTypeId: z.number().int().positive("Payment type is required"),
	note: z.string().optional(),
});

export const loanRejectionSchema = z.object({
	rejectedOnDate: z.string().min(1, "Rejection date is required"),
	dateFormat: z.string().default("dd MMMM yyyy"),
	locale: z.string().default("en"),
	note: z.string().optional(),
});

export const loanWithdrawalSchema = z.object({
	withdrawnOnDate: z.string().min(1, "Withdrawal date is required"),
	dateFormat: z.string().default("dd MMMM yyyy"),
	locale: z.string().default("en"),
	note: z.string().optional(),
});

export type LoanApprovalFormData = z.infer<typeof loanApprovalSchema>;
export type LoanDisbursementFormData = z.infer<typeof loanDisbursementSchema>;
export type LoanRejectionFormData = z.infer<typeof loanRejectionSchema>;
export type LoanWithdrawalFormData = z.infer<typeof loanWithdrawalSchema>;
