import { z } from "zod";
import {
	FINERACT_PASSWORD_MESSAGE,
	FINERACT_PASSWORD_REGEX,
} from "@/lib/schemas/password";

/**
 * Zod schema for creating a user
 * Based on PostUsersRequest from OpenAPI
 */
export const createUserSchema = z
	.object({
		username: z
			.string()
			.min(3, "Username must be at least 3 characters")
			.regex(
				/^[a-zA-Z0-9_]+$/,
				"Username can only contain letters, numbers, and underscores",
			),
		firstname: z.string().min(2, "First name must be at least 2 characters"),
		lastname: z.string().min(2, "Last name must be at least 2 characters"),
		email: z.string().email("Invalid email address").optional(),
		officeId: z.number().positive("Office is required"),
		staffId: z.number().optional(),
		roles: z.array(z.number()).min(1, "At least one role must be selected"),
		password: z
			.string()
			.regex(FINERACT_PASSWORD_REGEX, FINERACT_PASSWORD_MESSAGE),
		repeatPassword: z.string().min(12, "Please confirm password"),
		sendPasswordToEmail: z.boolean().optional(),
		passwordNeverExpires: z.boolean().optional(),
		isSelfServiceUser: z.boolean().optional(),
	})
	.refine((data) => data.password === data.repeatPassword, {
		message: "Passwords don't match",
		path: ["repeatPassword"],
	});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

/**
 * Converts form data to API request format
 */
export function userFormToRequest(data: CreateUserFormData) {
	return {
		username: data.username,
		firstname: data.firstname,
		lastname: data.lastname,
		email: data.email,
		officeId: data.officeId,
		staffId: data.staffId,
		roles: data.roles,
		password: data.password,
		repeatPassword: data.repeatPassword,
		sendPasswordToEmail: data.sendPasswordToEmail ?? false,
		passwordNeverExpires: data.passwordNeverExpires ?? false,
		isSelfServiceUser: data.isSelfServiceUser ?? false,
	};
}
