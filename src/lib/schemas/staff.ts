import { z } from "zod";
import { FINERACT_DATE_FORMAT, FINERACT_LOCALE } from "@/lib/date-utils";

/**
 * Zod schema for creating staff
 * Based on Staff type from OpenAPI
 */
export const createStaffSchema = z.object({
	officeId: z.number().positive("Office is required"),
	firstname: z.string().min(2, "First name must be at least 2 characters"),
	lastname: z.string().min(2, "Last name must be at least 2 characters"),
	isLoanOfficer: z.boolean().optional(),
	isActive: z.boolean().optional(),
	joiningDate: z.date().optional(),
	mobileNo: z.string().optional(),
	externalId: z.string().optional(),
});

export type CreateStaffFormData = z.infer<typeof createStaffSchema>;

export type StaffRequestPayload = {
	officeId: number;
	firstname: string;
	lastname: string;
	isLoanOfficer: boolean;
	isActive: boolean;
	dateFormat: string;
	locale: string;
	joiningDate?: string;
	mobileNo?: string;
	externalId?: string;
};

/**
 * Converts form data to API request format
 */
export function staffFormToRequest(
	data: CreateStaffFormData,
): StaffRequestPayload {
	const request: StaffRequestPayload = {
		officeId: data.officeId,
		firstname: data.firstname,
		lastname: data.lastname,
		isLoanOfficer: data.isLoanOfficer ?? false,
		isActive: data.isActive ?? true,
		dateFormat: FINERACT_DATE_FORMAT,
		locale: FINERACT_LOCALE,
	};

	if (data.joiningDate) {
		request.joiningDate = data.joiningDate.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	}

	if (data.mobileNo) {
		request.mobileNo = data.mobileNo;
	}

	if (data.externalId) {
		request.externalId = data.externalId;
	}

	return request;
}
