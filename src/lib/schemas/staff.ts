import { isValid, parseISO } from "date-fns";
import { z } from "zod";
import {
	formatDateForFineract,
	getFineractDateConfig,
	parseFineractDate,
} from "@/lib/date-utils";
import type {
	Staff,
	StaffData,
	StaffRequest,
} from "@/lib/fineract/generated/types.gen";

const MAX_NAME_LENGTH = 50;
const MAX_MOBILE_NO_LENGTH = 50;
const MAX_EXTERNAL_ID_LENGTH = 100;

const baseStaffSchema = z.object({
	officeId: z.number().positive("Office is required"),
	firstname: z
		.string()
		.trim()
		.min(1, "First name is required")
		.max(
			MAX_NAME_LENGTH,
			`First name must be ${MAX_NAME_LENGTH} characters or less`,
		),
	lastname: z
		.string()
		.trim()
		.min(1, "Last name is required")
		.max(
			MAX_NAME_LENGTH,
			`Last name must be ${MAX_NAME_LENGTH} characters or less`,
		),
	joiningDate: z.date().optional(),
	mobileNo: z
		.string()
		.trim()
		.max(
			MAX_MOBILE_NO_LENGTH,
			`Mobile number must be ${MAX_MOBILE_NO_LENGTH} characters or less`,
		)
		.optional(),
	externalId: z
		.string()
		.trim()
		.max(
			MAX_EXTERNAL_ID_LENGTH,
			`External ID must be ${MAX_EXTERNAL_ID_LENGTH} characters or less`,
		)
		.optional(),
	isLoanOfficer: z.boolean().optional(),
	isActive: z.boolean().optional(),
	forceStatus: z.boolean().optional(),
});

export type StaffFormValues = z.infer<typeof baseStaffSchema>;

export type StaffFormMode = "create" | "edit";

export type StaffFormRecord = Partial<Staff & StaffData>;

export type StaffRequestPayload = StaffRequest;

export function createStaffSchema({
	mode,
	allowedOfficeIds = [],
}: {
	mode: StaffFormMode;
	allowedOfficeIds?: number[];
}) {
	return baseStaffSchema.superRefine((data, ctx) => {
		if (mode === "create" && !data.joiningDate) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["joiningDate"],
				message: "Joining date is required",
			});
		}

		if (
			allowedOfficeIds.length > 0 &&
			!allowedOfficeIds.includes(data.officeId)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["officeId"],
				message: "Select one of the allowed offices",
			});
		}
	});
}

function normalizeOptionalText(value?: string) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function parseStaffDate(value?: string) {
	if (!value) {
		return undefined;
	}

	const isoDate = parseISO(value);
	if (isValid(isoDate)) {
		return isoDate;
	}

	try {
		const fineractDate = parseFineractDate(value);
		if (isValid(fineractDate)) {
			return fineractDate;
		}
	} catch {
		// Ignore and fall through to undefined.
	}

	return undefined;
}

export function getStaffOfficeId(staff?: StaffFormRecord) {
	return staff?.officeId ?? staff?.office?.id;
}

export function getStaffOfficeName(staff?: StaffFormRecord) {
	return staff?.officeName ?? staff?.office?.name;
}

export function getStaffIsActive(staff?: StaffFormRecord) {
	return staff?.isActive ?? staff?.active ?? true;
}

export function getStaffIsLoanOfficer(staff?: StaffFormRecord) {
	return staff?.isLoanOfficer ?? staff?.loanOfficer ?? false;
}

export function getStaffDisplayName(staff?: StaffFormRecord) {
	const explicitDisplayName = staff?.displayName?.trim();
	if (explicitDisplayName) {
		return explicitDisplayName;
	}

	return (
		[staff?.firstname, staff?.lastname].filter(Boolean).join(" ").trim() ||
		"Unnamed Staff"
	);
}

export function staffRecordToFormValues(
	staff?: StaffFormRecord,
): StaffFormValues {
	return {
		officeId: getStaffOfficeId(staff) ?? 0,
		firstname: staff?.firstname ?? "",
		lastname: staff?.lastname ?? "",
		joiningDate: parseStaffDate(staff?.joiningDate),
		mobileNo: staff?.mobileNo ?? "",
		externalId: staff?.externalId ?? "",
		isLoanOfficer: getStaffIsLoanOfficer(staff),
		isActive: getStaffIsActive(staff),
		forceStatus: false,
	};
}

export function staffFormToRequest(data: StaffFormValues): StaffRequestPayload {
	const request: StaffRequestPayload = {
		officeId: data.officeId,
		firstname: data.firstname.trim(),
		lastname: data.lastname.trim(),
		isLoanOfficer: data.isLoanOfficer ?? false,
		isActive: data.isActive ?? true,
		...getFineractDateConfig(),
	};

	if (data.joiningDate) {
		request.joiningDate = formatDateForFineract(data.joiningDate);
	}

	const mobileNo = normalizeOptionalText(data.mobileNo);
	if (mobileNo) {
		request.mobileNo = mobileNo;
	}

	const externalId = normalizeOptionalText(data.externalId);
	if (externalId) {
		request.externalId = externalId;
	}

	if (data.forceStatus) {
		request.forceStatus = true;
	}

	return request;
}
