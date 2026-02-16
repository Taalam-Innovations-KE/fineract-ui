import { z } from "zod";

const optionalPositionSchema = z.preprocess(
	(value) => {
		if (value === "" || value === null || value === undefined) {
			return undefined;
		}

		if (typeof value === "string") {
			return Number(value);
		}

		return value;
	},
	z
		.number({
			invalid_type_error: "Position must be a valid number",
		})
		.int("Position must be a whole number")
		.min(0, "Position must be 0 or greater")
		.optional(),
);

export const paymentTypeSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(100, "Name must be 100 characters or less"),
	description: z
		.string()
		.trim()
		.max(300, "Description must be 300 characters or less")
		.optional()
		.transform((value) => value || undefined),
	isCashPayment: z.boolean(),
	position: optionalPositionSchema,
});

export type PaymentTypeFormData = z.infer<typeof paymentTypeSchema>;
