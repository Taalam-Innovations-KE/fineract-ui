import { z } from "zod";
import {
	FINERACT_PASSWORD_MESSAGE,
	FINERACT_PASSWORD_REGEX,
} from "@/lib/schemas/password";

export const selfServiceUserSchema = z
	.object({
		username: z.string().min(3, "Username must be at least 3 characters"),
		firstname: z.string().min(2, "First name must be at least 2 characters"),
		lastname: z.string().min(2, "Last name must be at least 2 characters"),
		email: z
			.string()
			.email("A valid email address is required")
			.optional()
			.or(z.literal("")),
		officeId: z.number().positive("Office is required"),
		roleId: z.number().positive("Self-service role is required"),
		clientId: z.number().positive("Client is required"),
		password: z
			.string()
			.optional()
			.or(z.literal(""))
			.refine(
				(value) =>
					!value || value.length === 0 || FINERACT_PASSWORD_REGEX.test(value),
				FINERACT_PASSWORD_MESSAGE,
			),
		repeatPassword: z.string().optional().or(z.literal("")),
		sendPasswordToEmail: z.boolean().optional(),
		passwordNeverExpires: z.boolean().optional(),
	})
	.refine(
		(data) =>
			(data.password && data.password.length > 0) ||
			(data.repeatPassword && data.repeatPassword.length > 0)
				? data.password === data.repeatPassword
				: true,
		{
			message: "Passwords don't match",
			path: ["repeatPassword"],
		},
	);

export type SelfServiceUserFormData = z.infer<typeof selfServiceUserSchema>;
