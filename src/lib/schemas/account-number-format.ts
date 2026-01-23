import { z } from "zod";

/**
 * Zod schema for creating an account number format
 * Aligned with PostAccountNumberFormatsRequest from OpenAPI
 */
export const createAccountNumberFormatSchema = z.object({
	accountType: z.number().positive("Account type is required"),
	prefixType: z.number().positive("Prefix type is required"),
});

export type CreateAccountNumberFormatFormData = z.infer<
	typeof createAccountNumberFormatSchema
>;
