import { z } from "zod";
import type {
	GetRolesResponse,
	GetUsersResponse,
	GetUsersUserIdResponse,
	PostUsersRequest,
	PutUsersUserIdRequest,
	RoleData,
	Staff,
	StaffData,
} from "@/lib/fineract/generated/types.gen";
import {
	FINERACT_PASSWORD_MESSAGE,
	FINERACT_PASSWORD_REGEX,
} from "@/lib/schemas/password";

const MAX_USERNAME_LENGTH = 100;
const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 100;

const baseUserSchema = z.object({
	username: z
		.string()
		.trim()
		.min(1, "Username is required")
		.max(
			MAX_USERNAME_LENGTH,
			`Username must be ${MAX_USERNAME_LENGTH} characters or less`,
		),
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
	email: z
		.string()
		.trim()
		.min(1, "Email is required")
		.max(
			MAX_EMAIL_LENGTH,
			`Email must be ${MAX_EMAIL_LENGTH} characters or less`,
		)
		.email("A valid email address is required"),
	officeId: z.number().positive("Office is required"),
	staffId: z.number().positive("Select a valid staff record").optional(),
	roles: z
		.array(z.number().positive())
		.min(1, "At least one role must be selected"),
	sendPasswordToEmail: z.boolean().optional(),
	passwordNeverExpires: z.boolean().optional(),
	password: z.string().optional(),
	repeatPassword: z.string().optional(),
});

export type UserFormValues = z.infer<typeof baseUserSchema>;

export type UserFormMode = "create" | "edit";

export type UserRoleOption = GetRolesResponse | RoleData;

export type UserFormRecord = Partial<
	GetUsersResponse & GetUsersUserIdResponse
> & {
	allowedOffices?: Array<{
		id?: number;
		name?: string;
		nameDecorated?: string;
	}>;
	availableRoles?: RoleData[];
	selfServiceRoles?: RoleData[];
	staffId?: number;
	staff?: StaffData;
};

export type UserLinkedStaffRecord = Partial<Staff & StaffData>;

export function createUserSchema({
	mode,
	allowedOfficeIds = [],
	availableRoleIds = [],
}: {
	mode: UserFormMode;
	allowedOfficeIds?: number[];
	availableRoleIds?: number[];
}) {
	return baseUserSchema.superRefine((data, ctx) => {
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

		if (
			availableRoleIds.length > 0 &&
			data.roles.some((roleId) => !availableRoleIds.includes(roleId))
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["roles"],
				message: "Select only roles available for this user",
			});
		}

		const password = (data.password ?? "").trim();
		const repeatPassword = (data.repeatPassword ?? "").trim();
		const passwordProvided = Boolean(password || repeatPassword);
		const passwordRequired = mode === "create" && !data.sendPasswordToEmail;

		if (!passwordRequired && !passwordProvided) {
			return;
		}

		if (!password) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: "Password is required",
			});
		} else if (!FINERACT_PASSWORD_REGEX.test(password)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: FINERACT_PASSWORD_MESSAGE,
			});
		}

		if (!repeatPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["repeatPassword"],
				message: "Please confirm password",
			});
		}

		if (password && repeatPassword && password !== repeatPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["repeatPassword"],
				message: "Passwords do not match",
			});
		}
	});
}

function normalizeOptionalText(value?: string) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

export function getUserRoleIds(user?: UserFormRecord) {
	return (user?.selectedRoles ?? [])
		.map((role) => role.id)
		.filter((roleId): roleId is number => typeof roleId === "number");
}

export function getUserLinkedStaffId(user?: UserFormRecord) {
	return user?.staffId ?? user?.staff?.id;
}

export function getUserDisplayName(user?: UserFormRecord) {
	return (
		[user?.firstname, user?.lastname].filter(Boolean).join(" ").trim() ||
		"Unnamed User"
	);
}

export function userRecordToFormValues(user?: UserFormRecord): UserFormValues {
	return {
		username: user?.username ?? "",
		firstname: user?.firstname ?? "",
		lastname: user?.lastname ?? "",
		email: user?.email ?? "",
		officeId: user?.officeId ?? 0,
		staffId: getUserLinkedStaffId(user),
		roles: getUserRoleIds(user),
		sendPasswordToEmail: false,
		passwordNeverExpires: user?.passwordNeverExpires ?? false,
		password: "",
		repeatPassword: "",
	};
}

export function userFormToCreateRequest(
	data: UserFormValues,
): PostUsersRequest {
	const request: PostUsersRequest = {
		username: data.username.trim(),
		firstname: data.firstname.trim(),
		lastname: data.lastname.trim(),
		email: data.email.trim(),
		officeId: data.officeId,
		roles: data.roles,
		sendPasswordToEmail: data.sendPasswordToEmail ?? false,
		passwordNeverExpires: data.passwordNeverExpires ?? false,
	};

	if (data.staffId) {
		request.staffId = data.staffId;
	}

	const password = normalizeOptionalText(data.password);
	const repeatPassword = normalizeOptionalText(data.repeatPassword);

	if (password) {
		request.password = password;
	}

	if (repeatPassword) {
		request.repeatPassword = repeatPassword;
	}

	return request;
}

export function userFormToUpdateRequest(
	data: UserFormValues,
): PutUsersUserIdRequest {
	const request: PutUsersUserIdRequest = {
		firstname: data.firstname.trim(),
		lastname: data.lastname.trim(),
		email: data.email.trim(),
		officeId: data.officeId,
		roles: data.roles,
	};

	if (data.staffId) {
		request.staffId = data.staffId;
	}

	const password = normalizeOptionalText(data.password);
	const repeatPassword = normalizeOptionalText(data.repeatPassword);

	if (password) {
		request.password = password;
	}

	if (repeatPassword) {
		request.repeatPassword = repeatPassword;
	}

	return request;
}
