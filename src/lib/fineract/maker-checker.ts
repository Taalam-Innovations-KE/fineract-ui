import { fineractFetch } from "./client.server";
import type {
	AuditData,
	GetGlobalConfigurationsResponse,
	GetPermissionsResponse,
	GlobalConfigurationPropertyData,
} from "./generated/types.gen";

export interface GlobalConfig {
	enabled: boolean;
}

export interface Permission {
	id: number;
	code: string;
	grouping: string;
	selected: boolean;
}

export interface MakerCheckerEntry {
	auditId: number;
	makerId: number;
	checkerId?: number;
	madeOnDate: string;
	processingResult: string;
	resourceId: string;
	entityName: string;
	commandAsJson?: string;
}

/**
 * Get global maker checker configuration
 */
export async function getGlobalConfig(): Promise<GlobalConfig> {
	const response = await fineractFetch<GetGlobalConfigurationsResponse>(
		"/v1/configurations",
		{ method: "GET" },
	);
	const config = response.globalConfiguration?.find(
		(c: GlobalConfigurationPropertyData) => c.name === "Maker-checker",
	);
	return { enabled: config?.enabled || false };
}

/**
 * Update global maker checker configuration
 */
export async function updateGlobalConfig(enabled: boolean): Promise<void> {
	await fineractFetch(`/v1/configurations/name/Maker-checker`, {
		method: "PUT",
		body: { value: enabled },
	});
}

/**
 * Get permissions with maker checker settings
 */
export async function getPermissions(): Promise<Permission[]> {
	const response = await fineractFetch<GetPermissionsResponse[]>(
		"/v1/permissions?makerCheckerable=true",
		{ method: "GET" },
	);
	return response.map((p: GetPermissionsResponse, index: number) => ({
		id: index + 1, // Placeholder - need proper ID mapping
		code: p.code || "",
		grouping: p.grouping || "",
		selected: p.selected || false,
	}));
}

/**
 * Update permissions for maker checker
 */
export async function updatePermissions(
	permissions: { code: string; selected: boolean }[],
): Promise<void> {
	await fineractFetch("/v1/permissions", {
		method: "PUT",
		body: permissions,
	});
}

/**
 * Get maker checker inbox
 */
export async function getInbox(params?: {
	makerId?: number;
	checkerId?: number;
	makerDateTimeFrom?: string;
	makerDateTimeTo?: string;
	officeId?: number;
	includeJson?: boolean;
}): Promise<MakerCheckerEntry[]> {
	const query = new URLSearchParams();
	if (params?.makerId) query.append("makerId", params.makerId.toString());
	if (params?.checkerId) query.append("checkerId", params.checkerId.toString());
	if (params?.makerDateTimeFrom)
		query.append("makerDateTimeFrom", params.makerDateTimeFrom);
	if (params?.makerDateTimeTo)
		query.append("makerDateTimeTo", params.makerDateTimeTo);
	if (params?.officeId) query.append("officeId", params.officeId.toString());
	if (params?.includeJson) query.append("includeJson", "true");

	const response = await fineractFetch<any>(
		`/v1/makercheckers?${query.toString()}`,
		{ method: "GET" },
	);
	return (
		response.pageItems?.map((item: any) => ({
			auditId: item.auditId,
			makerId: item.maker,
			checkerId: item.checker,
			madeOnDate: item.madeOnDate,
			processingResult: item.processingResult,
			resourceId: item.resourceId,
			entityName: item.entityName,
			commandAsJson: item.commandAsJson,
		})) || []
	);
}

/**
 * Approve or reject a maker checker entry
 */
export async function approveRejectEntry(
	auditId: number,
	command: "approve" | "reject",
): Promise<void> {
	await fineractFetch(`/v1/makercheckers/${auditId}`, {
		method: "POST",
		body: { command },
	});
}
