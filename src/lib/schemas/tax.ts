import { z } from "zod";

const coerceEmptyToUndefined = (value: unknown) => {
	if (value === "" || value === null || value === undefined) {
		return undefined;
	}

	if (typeof value === "number" && Number.isNaN(value)) {
		return undefined;
	}

	return value;
};

const optionalPositiveInteger = z.preprocess(
	coerceEmptyToUndefined,
	z.number().int().positive().optional(),
);

const optionalDateString = z
	.preprocess(coerceEmptyToUndefined, z.string().trim().optional())
	.optional();

export const taxComponentSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "Name is required")
			.max(100, "Name must be 100 characters or less"),
		percentage: z.coerce
			.number({ error: "Percentage is required" })
			.positive("Percentage must be greater than 0")
			.max(100, "Percentage cannot exceed 100"),
		startDate: optionalDateString,
		debitAccountType: optionalPositiveInteger,
		debitAccountId: optionalPositiveInteger,
		creditAccountType: optionalPositiveInteger,
		creditAccountId: optionalPositiveInteger,
	})
	.superRefine((data, ctx) => {
		if (
			(data.debitAccountType === undefined) !==
			(data.debitAccountId === undefined)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path:
					data.debitAccountType === undefined
						? ["debitAccountType"]
						: ["debitAccountId"],
				message: "Debit account type and account must be set together",
			});
		}

		if (
			(data.creditAccountType === undefined) !==
			(data.creditAccountId === undefined)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path:
					data.creditAccountType === undefined
						? ["creditAccountType"]
						: ["creditAccountId"],
				message: "Credit account type and account must be set together",
			});
		}
	});

const taxGroupComponentSchema = z.object({
	id: optionalPositiveInteger,
	taxComponentId: optionalPositiveInteger,
	startDate: optionalDateString,
	endDate: optionalDateString,
});

export const taxGroupSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "Name is required")
			.max(100, "Name must be 100 characters or less"),
		taxComponents: z.array(taxGroupComponentSchema),
	})
	.superRefine((data, ctx) => {
		if (data.taxComponents.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["taxComponents"],
				message: "At least one tax component is required",
			});
		}

		for (const [index, component] of data.taxComponents.entries()) {
			if (component.taxComponentId === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["taxComponents", index, "taxComponentId"],
					message: "Select a tax component",
				});
			}

			if (component.id === undefined && component.endDate) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["taxComponents", index, "endDate"],
					message: "New tax group components cannot start with an end date",
				});
			}
		}
	});

export type TaxComponentFormData = z.infer<typeof taxComponentSchema>;
export type TaxGroupFormData = z.infer<typeof taxGroupSchema>;
