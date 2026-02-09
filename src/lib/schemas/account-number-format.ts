import { z } from "zod";
import { PREFIX_SHORT_NAME_TYPE_ID } from "@/lib/fineract/account-number-formats";

/**
 * Zod schema for creating an account number format
 * Includes runtime validation for prefixCharacter when PREFIX_SHORT_NAME is selected.
 */
export const createAccountNumberFormatSchema = z
	.object({
		accountType: z.number().positive("Account type is required"),
		prefixType: z.number().positive("Prefix type is required"),
		prefixCharacter: z
			.string()
			.trim()
			.max(20, "Prefix characters must be 20 characters or less")
			.optional(),
	})
	.superRefine((data, context) => {
		if (
			data.prefixType === PREFIX_SHORT_NAME_TYPE_ID &&
			!data.prefixCharacter?.trim()
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Prefix characters are required for PREFIX_SHORT_NAME",
				path: ["prefixCharacter"],
			});
		}
	});

export type CreateAccountNumberFormatFormData = z.infer<
	typeof createAccountNumberFormatSchema
>;
