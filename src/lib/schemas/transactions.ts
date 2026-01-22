import { z } from "zod";

/**
 * Zod schema for transaction list filters
 * Based on journal entries query parameters
 */
export const transactionFiltersSchema = z.object({
	officeId: z.number().optional(),
	glAccountId: z.number().optional(),
	manualEntriesOnly: z.boolean().optional(),
	fromDate: z.date().optional(),
	toDate: z.date().optional(),
	transactionId: z.string().optional(),
	loanId: z.number().optional(),
	savingsId: z.number().optional(),
	runningBalance: z.boolean().optional(),
	transactionDetails: z.boolean().optional(),
	offset: z.number().min(0).optional(),
	limit: z.number().min(1).max(200).optional(),
	orderBy: z.string().optional(),
	sortOrder: z.enum(["ASC", "DESC"]).optional(),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

/**
 * Schema for transaction search form
 */
export const transactionSearchSchema = z.object({
	searchTerm: z.string().optional(),
	fromDate: z.date().optional(),
	toDate: z.date().optional(),
	officeId: z.number().optional(),
	glAccountId: z.number().optional(),
	entryType: z.string().optional(),
});

export type TransactionSearchFormData = z.infer<typeof transactionSearchSchema>;
