import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetGlobalConfigurationsResponse,
	GetRolesResponse,
	GetRolesRoleIdPermissionsResponse,
	GetRolesRoleIdPermissionsResponsePermissionData,
	GetUsersResponse,
	GetUsersTemplateResponse,
	GetUsersUserIdResponse,
	GlobalConfigurationPropertyData,
	PostUsersRequest,
	PutGlobalConfigurationsRequest,
	PutUsersUserIdRequest,
} from "@/lib/fineract/generated/types.gen";

export type SelfServiceUser = GetUsersResponse & {
	isSelfServiceUser?: boolean;
};

export type SelfServiceUserDetails = GetUsersUserIdResponse & {
	isSelfServiceUser?: boolean;
	clients?: number[];
};

export type ClientOption = {
	id: number;
	displayName: string;
	accountNo?: string;
};

export type SelfServicePermissionPreset = {
	id: "loan-basic" | "loan-plus-savings";
	label: string;
	description: string;
	requiredCodes: string[];
};

export const SELF_SERVICE_PERMISSION_PRESETS: SelfServicePermissionPreset[] = [
	{
		id: "loan-basic",
		label: "Loan Self-Service (Recommended)",
		description:
			"Allows customers to view profile, browse loan products, submit loans, and view loan details.",
		requiredCodes: [
			"READ_USER",
			"READ_CLIENT",
			"READ_LOANPRODUCT",
			"READ_LOAN",
			"CREATE_LOAN",
		],
	},
	{
		id: "loan-plus-savings",
		label: "Loan + Savings Self-Service",
		description:
			"Extends loan self-service with savings visibility and account transfers.",
		requiredCodes: [
			"READ_USER",
			"READ_CLIENT",
			"READ_LOANPRODUCT",
			"READ_LOAN",
			"CREATE_LOAN",
			"READ_SAVINGSPRODUCT",
			"READ_SAVINGSACCOUNT",
			"READ_ACCOUNTTRANSFER",
			"CREATE_ACCOUNTTRANSFER",
		],
	},
];

export type UpsertSelfServiceUserInput = {
	username: string;
	firstname: string;
	lastname: string;
	email?: string;
	officeId: number;
	roleId: number;
	clientId: number;
	password?: string;
	repeatPassword?: string;
	sendPasswordToEmail?: boolean;
	passwordNeverExpires?: boolean;
};

type ClientsResponse =
	| {
			pageItems?: Array<{
				id?: number;
				displayName?: string;
				accountNo?: string;
			}>;
	  }
	| Array<{
			id?: number;
			displayName?: string;
			accountNo?: string;
	  }>;

async function parseJsonResponse<T>(response: Response): Promise<T> {
	const rawPayload = await response.text();
	const payload = rawPayload ? (JSON.parse(rawPayload) as unknown) : null;

	if (!response.ok) {
		throw (
			payload ?? {
				message: response.statusText || "Request failed",
				statusCode: response.status,
			}
		);
	}

	return (payload ?? {}) as T;
}

function requestHeaders(tenantId: string) {
	return {
		"x-tenant-id": tenantId,
		"Content-Type": "application/json",
	};
}

function normalizeClients(response: ClientsResponse): ClientOption[] {
	const rows = Array.isArray(response) ? response : (response.pageItems ?? []);
	const normalized: ClientOption[] = [];

	for (const client of rows) {
		if (
			typeof client.id !== "number" ||
			typeof client.displayName !== "string"
		) {
			continue;
		}

		normalized.push({
			id: client.id,
			displayName: client.displayName,
			accountNo: client.accountNo,
		});
	}

	return normalized;
}

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === "object") {
		return value as Record<string, unknown>;
	}

	return {};
}

export function hasSelfServiceFlag(user: unknown): boolean {
	const record = asRecord(user);
	const direct = record.isSelfServiceUser;
	const legacy = record.selfServiceUser;

	return direct === true || legacy === true;
}

export function readUserClientIds(user: unknown): number[] {
	const record = asRecord(user);
	const value = record.clients;

	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter((entry): entry is number => typeof entry === "number");
}

export function buildRolePermissionUpdate(
	permissionUsageData: GetRolesRoleIdPermissionsResponsePermissionData[],
	selectedCodes: Set<string>,
): Record<string, boolean> {
	return Object.fromEntries(
		permissionUsageData
			.filter((permission) => typeof permission.code === "string")
			.map((permission) => {
				const code = permission.code as string;
				return [code, selectedCodes.has(code)];
			}),
	);
}

export async function getUsersTemplate(
	tenantId: string,
): Promise<GetUsersTemplateResponse> {
	const response = await fetch(BFF_ROUTES.usersTemplate, {
		headers: requestHeaders(tenantId),
	});

	return parseJsonResponse(response);
}

export async function getRole(
	tenantId: string,
	roleId: number,
): Promise<GetRolesResponse> {
	const response = await fetch(`${BFF_ROUTES.roles}/${roleId}`, {
		headers: requestHeaders(tenantId),
	});

	return parseJsonResponse(response);
}

export async function getRolePermissions(
	tenantId: string,
	roleId: number,
): Promise<GetRolesRoleIdPermissionsResponse> {
	const response = await fetch(BFF_ROUTES.rolePermissions(roleId), {
		headers: requestHeaders(tenantId),
	});

	return parseJsonResponse(response);
}

export async function updateRolePermissions(
	tenantId: string,
	roleId: number,
	permissions: Record<string, boolean>,
): Promise<unknown> {
	const response = await fetch(BFF_ROUTES.rolePermissions(roleId), {
		method: "PUT",
		headers: requestHeaders(tenantId),
		body: JSON.stringify({ permissions }),
	});

	return parseJsonResponse(response);
}

export async function setRoleStatus(
	tenantId: string,
	roleId: number,
	command: "enable" | "disable",
): Promise<unknown> {
	const response = await fetch(
		`${BFF_ROUTES.roles}/${roleId}?command=${command}`,
		{
			method: "POST",
			headers: requestHeaders(tenantId),
		},
	);

	return parseJsonResponse(response);
}

export async function getSelfServiceConfiguration(
	tenantId: string,
): Promise<GlobalConfigurationPropertyData | null> {
	const response = await fetch(BFF_ROUTES.configurations, {
		headers: requestHeaders(tenantId),
	});

	const payload =
		await parseJsonResponse<GetGlobalConfigurationsResponse>(response);
	const configurations = payload.globalConfiguration ?? [];

	return (
		configurations.find(
			(config) => config.name === "self-service-user-enabled",
		) ?? null
	);
}

export async function updateSelfServiceConfiguration(
	tenantId: string,
	configId: number,
	enabled: boolean,
): Promise<unknown> {
	const payload: PutGlobalConfigurationsRequest = { enabled };
	const response = await fetch(`${BFF_ROUTES.configurations}/${configId}`, {
		method: "PUT",
		headers: requestHeaders(tenantId),
		body: JSON.stringify(payload),
	});

	return parseJsonResponse(response);
}

export async function listSelfServiceUsers(
	tenantId: string,
): Promise<SelfServiceUser[]> {
	const response = await fetch(BFF_ROUTES.users, {
		headers: requestHeaders(tenantId),
	});

	const users = await parseJsonResponse<GetUsersResponse[]>(response);

	return users.filter((user) => hasSelfServiceFlag(user)) as SelfServiceUser[];
}

export async function getUserById(
	tenantId: string,
	userId: number,
): Promise<SelfServiceUserDetails> {
	const response = await fetch(`${BFF_ROUTES.users}/${userId}`, {
		headers: requestHeaders(tenantId),
	});

	return parseJsonResponse(response);
}

export async function listClientsForSelection(
	tenantId: string,
	searchTerm = "",
): Promise<ClientOption[]> {
	const params = new URLSearchParams({
		offset: "0",
		limit: "200",
		orderBy: "displayName",
		sortOrder: "ASC",
		fields: "id,displayName,accountNo",
	});

	if (searchTerm.trim().length > 0) {
		params.set("sqlSearch", `display_name like '%${searchTerm.trim()}%'`);
	}

	const response = await fetch(`${BFF_ROUTES.clients}?${params.toString()}`, {
		headers: requestHeaders(tenantId),
	});

	const payload = await parseJsonResponse<ClientsResponse>(response);
	return normalizeClients(payload);
}

export async function createSelfServiceUser(
	tenantId: string,
	input: UpsertSelfServiceUserInput,
): Promise<unknown> {
	const payload: PostUsersRequest = {
		username: input.username,
		firstname: input.firstname,
		lastname: input.lastname,
		email: input.email,
		officeId: input.officeId,
		roles: [input.roleId],
		clients: [input.clientId],
		password: input.password,
		repeatPassword: input.repeatPassword,
		sendPasswordToEmail: input.sendPasswordToEmail ?? false,
		passwordNeverExpires: input.passwordNeverExpires ?? false,
		isSelfServiceUser: true,
	};

	const response = await fetch(BFF_ROUTES.users, {
		method: "POST",
		headers: requestHeaders(tenantId),
		body: JSON.stringify(payload),
	});

	return parseJsonResponse(response);
}

export async function updateSelfServiceUser(
	tenantId: string,
	userId: number,
	input: UpsertSelfServiceUserInput,
): Promise<unknown> {
	const payload: PutUsersUserIdRequest = {
		firstname: input.firstname,
		lastname: input.lastname,
		email: input.email,
		officeId: input.officeId,
		roles: [input.roleId],
		clients: [input.clientId],
		sendPasswordToEmail: input.sendPasswordToEmail ?? false,
		isSelfServiceUser: true,
	};

	if (input.password && input.repeatPassword) {
		payload.password = input.password;
		payload.repeatPassword = input.repeatPassword;
	}

	const response = await fetch(`${BFF_ROUTES.users}/${userId}`, {
		method: "PUT",
		headers: requestHeaders(tenantId),
		body: JSON.stringify(payload),
	});

	return parseJsonResponse(response);
}
