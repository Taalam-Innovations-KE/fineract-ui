import { z } from "zod";

/**
 * Guarantor Types:
 * 1 = Existing Client
 * 2 = Staff Member
 * 3 = External Person
 */
export const GUARANTOR_TYPES = {
	EXISTING_CLIENT: 1,
	STAFF: 2,
	EXTERNAL: 3,
} as const;

// Base guarantor fields common to all types
const baseGuarantorFields = {
	amount: z.number().positive("Amount must be positive").optional(),
	savingsId: z.number().int().optional(),
	clientRelationshipTypeId: z.number().int().optional(),
	comment: z.string().max(500).optional(),
};

// Existing Client Guarantor
export const existingClientGuarantorSchema = z.object({
	guarantorTypeId: z.literal(GUARANTOR_TYPES.EXISTING_CLIENT),
	entityId: z.number().int().min(1, "Select a client"),
	...baseGuarantorFields,
});

// Staff Member Guarantor
export const staffGuarantorSchema = z.object({
	guarantorTypeId: z.literal(GUARANTOR_TYPES.STAFF),
	entityId: z.number().int().min(1, "Select a staff member"),
	...baseGuarantorFields,
});

// External Person Guarantor
export const externalGuarantorSchema = z.object({
	guarantorTypeId: z.literal(GUARANTOR_TYPES.EXTERNAL),
	firstname: z.string().min(1, "First name is required"),
	lastname: z.string().min(1, "Last name is required"),
	dob: z.string().optional(),
	addressLine1: z.string().optional(),
	addressLine2: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	zip: z.string().optional(),
	country: z.string().optional(),
	mobileNumber: z.string().optional(),
	housePhoneNumber: z.string().optional(),
	...baseGuarantorFields,
});

// Combined guarantor schema using discriminated union
export const guarantorSchema = z.discriminatedUnion("guarantorTypeId", [
	existingClientGuarantorSchema,
	staffGuarantorSchema,
	externalGuarantorSchema,
]);

// Document upload schema
export const documentUploadSchema = z.object({
	name: z.string().min(1, "Document name is required").max(100),
	description: z.string().max(500).optional(),
	file: z.instanceof(File, { message: "File is required" }),
});

// Collateral schema
export const collateralSchema = z.object({
	type: z.number().int().min(1, "Select collateral type"),
	value: z.number().positive("Value must be positive"),
	description: z.string().max(500).optional(),
});

// Type exports
export type ExistingClientGuarantor = z.infer<
	typeof existingClientGuarantorSchema
>;
export type StaffGuarantor = z.infer<typeof staffGuarantorSchema>;
export type ExternalGuarantor = z.infer<typeof externalGuarantorSchema>;
export type GuarantorInput = z.infer<typeof guarantorSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type CollateralInput = z.infer<typeof collateralSchema>;

// Response types (what comes back from API)
export interface GuarantorResponse {
	id?: number;
	loanId?: number;
	clientRelationshipType?: { id?: number; name?: string };
	guarantorType?: { id?: number; value?: string };
	entityId?: number;
	firstname?: string;
	lastname?: string;
	dob?: number[];
	addressLine1?: string;
	addressLine2?: string;
	city?: string;
	state?: string;
	zip?: string;
	country?: string;
	mobileNumber?: string;
	housePhoneNumber?: string;
	status?: boolean;
	onHoldAmount?: number;
	savingsId?: number;
	amount?: number;
	joinedDate?: number[];
}

export interface DocumentResponse {
	id?: number;
	parentEntityType?: string;
	parentEntityId?: number;
	name?: string;
	fileName?: string;
	size?: number;
	type?: string;
	description?: string;
}

export interface CollateralResponse {
	id?: number;
	type?: { id?: number; name?: string; description?: string };
	value?: number;
	description?: string;
}

export interface GuarantorTemplateResponse {
	guarantorTypeOptions?: Array<{ id: number; value: string }>;
	clientRelationshipTypes?: Array<{ id: number; name: string }>;
	allowedClientRelationshipTypes?: Array<{ id: number; name: string }>;
}

export interface CollateralTemplateResponse {
	allowedCollateralTypes?: Array<{
		id: number;
		name: string;
		description?: string;
	}>;
}
