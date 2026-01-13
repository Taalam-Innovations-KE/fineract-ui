import { z } from "zod";
import { formatDateForFineract, getFineractDateConfig } from "@/lib/date-utils";
import type {
	PostUsersRequest,
	StaffRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	FINERACT_PASSWORD_MESSAGE,
	FINERACT_PASSWORD_REGEX,
} from "@/lib/schemas/password";

/**
 * Zod schema for creating a staff member and linked user
 */
export const createTeamMemberSchema = z
	.object({
		firstname: z.string().min(2, "First name must be at least 2 characters"),
		lastname: z.string().min(2, "Last name must be at least 2 characters"),
		officeId: z.number().positive("Office is required"),
		joiningDate: z.date().optional(),
		mobileNo: z.string().optional(),
		externalId: z.string().optional(),
		isLoanOfficer: z.boolean().optional(),
		isActive: z.boolean().optional(),
		email: z.string().email("A valid email address is required"),
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

export type CreateTeamMemberFormData = z.infer<typeof createTeamMemberSchema>;

export type TeamMemberRequestPayload = {
	staff: StaffRequest;
	user: PostUsersRequest;
};

/**
 * Converts team member form data to staff + user API payloads
 */
export function teamMemberFormToRequest(
	data: CreateTeamMemberFormData,
): TeamMemberRequestPayload {
	const staffRequest: StaffRequest = {
		officeId: data.officeId,
		firstname: data.firstname,
		lastname: data.lastname,
		isLoanOfficer: data.isLoanOfficer ?? false,
		isActive: data.isActive ?? true,
		...getFineractDateConfig(),
	};

	if (data.joiningDate) {
		staffRequest.joiningDate = formatDateForFineract(data.joiningDate);
	}

	if (data.mobileNo) {
		staffRequest.mobileNo = data.mobileNo;
	}

	if (data.externalId) {
		staffRequest.externalId = data.externalId;
	}

	const userRequest: PostUsersRequest = {
		username: data.email,
		email: data.email,
		firstname: data.firstname,
		lastname: data.lastname,
		officeId: data.officeId,
		roles: data.roles,
		password: data.password,
		repeatPassword: data.repeatPassword,
		sendPasswordToEmail: data.sendPasswordToEmail ?? false,
		passwordNeverExpires: data.passwordNeverExpires ?? false,
		isSelfServiceUser: data.isSelfServiceUser ?? false,
	};

	return {
		staff: staffRequest,
		user: userRequest,
	};
}
