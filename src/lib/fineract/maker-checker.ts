import { fineractFetch } from "./client.server";
import type {
	AppUser,
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

export interface SuperCheckerUser {
	id: number;
	username: string;
	displayName?: string;
	email?: string;
	isSuperChecker: boolean;
	officeName?: string;
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
		(c: GlobalConfigurationPropertyData) => c.name === "maker-checker",
	);
	return { enabled: config?.enabled || false };
}

/**
 * Update global maker checker configuration
 */
export async function updateGlobalConfig(enabled: boolean): Promise<void> {
	await fineractFetch(`/v1/configurations/name/maker-checker`, {
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
 * Update bulk permissions for maker checker
 */
export async function updateBulkPermissions(
	permissionCodes: string[],
	enable: boolean,
): Promise<void> {
	const updates = permissionCodes.map((code) => ({
		code,
		selected: enable,
	}));
	await updatePermissions(updates);
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

	const response = await fineractFetch<{
		pageItems?: unknown[];
	}>(`/v1/makercheckers?${query.toString()}`, { method: "GET" });
	return (
		response.pageItems?.map((item: unknown) => {
			const obj = item as Record<string, unknown>;
			return {
				auditId: obj.auditId as number,
				makerId: obj.maker as number,
				checkerId: obj.checker as number | undefined,
				madeOnDate: obj.madeOnDate as string,
				processingResult: obj.processingResult as string,
				resourceId: obj.resourceId as string,
				entityName: obj.entityName as string,
				commandAsJson: obj.commandAsJson as string | undefined,
			};
		}) || []
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

/**
 * Get all users for super checker management
 */
export async function getUsersForSuperChecker(): Promise<SuperCheckerUser[]> {
	const response = await fineractFetch<AppUser[]>("/v1/users", {
		method: "GET",
	});

	return response.map((user: AppUser) => ({
		id: user.id || 0,
		username: user.username || "",
		displayName:
			user.displayName ||
			`${user.firstname || ""} ${user.lastname || ""}`.trim() ||
			user.username ||
			"",
		email: user.email || "",
		isSuperChecker: user.checkerSuperUser || false,
		officeName: user.office?.name || "",
	}));
}

/**
 * Update super checker status for a user
 */
export async function updateSuperCheckerStatus(
	userId: number,
	isSuperChecker: boolean,
): Promise<void> {
	await fineractFetch(`/v1/users/${userId}`, {
		method: "PUT",
		body: { checkerSuperUser: isSuperChecker },
	});
}

/**
 * Get maker checker search template (user's checker permissions)
 */
export async function getMakerCheckerSearchTemplate(): Promise<{
	actionNames: string[];
	entityNames: string[];
	appUsers: Array<{ id: number; username: string }>;
}> {
	const response = await fineractFetch<{
		actionNames?: string[];
		entityNames?: string[];
		appUsers?: Array<{ id: number; username: string }>;
	}>("/v1/makercheckers/searchtemplate", {});

	return {
		actionNames: response.actionNames || [],
		entityNames: response.entityNames || [],
		appUsers: response.appUsers || [],
	};
}

/**
 * Filter inbox entries based on user's checker permissions
 */
export async function getFilteredInbox(
	userId?: number,
): Promise<MakerCheckerEntry[]> {
	const [inbox, searchTemplate] = await Promise.all([
		getInbox(),
		getMakerCheckerSearchTemplate(),
	]);

	// If user is a super checker, show all entries
	const users = await getUsersForSuperChecker();
	const user = users.find((u) => u.id === userId);
	if (user?.isSuperChecker) {
		return inbox;
	}

	// Filter based on checker permissions
	return inbox.filter((entry) =>
		searchTemplate.entityNames.includes(entry.entityName),
	);
}

/**
 * Validate if user can approve a specific entry
 */
export async function canApproveEntry(
	auditId: number,
	userId?: number,
): Promise<boolean> {
	try {
		const [entry, searchTemplate, users] = await Promise.all([
			getInbox().then((items) => items.find((i) => i.auditId === auditId)),
			getMakerCheckerSearchTemplate(),
			getUsersForSuperChecker(),
		]);

		if (!entry) return false;

		// Super checkers can approve anything
		const user = users.find((u) => u.id === userId);
		if (user?.isSuperChecker) return true;

		// Check if user has permission for this entity
		return searchTemplate.entityNames.includes(entry.entityName);
	} catch (error) {
		console.error("Failed to validate approval permission:", error);
		return false;
	}
}

/**
 * Get maker checker impact analysis
 */
export async function getMakerCheckerImpact(): Promise<{
	totalPermissions: number;
	enabledPermissions: number;
	totalUsers: number;
	superCheckerUsers: number;
	pendingApprovals: number;
}> {
	try {
		const [permissions, users, inbox] = await Promise.all([
			getPermissions(),
			getUsersForSuperChecker(),
			getInbox(),
		]);

		const enabledPermissions = permissions.filter((p) => p.selected).length;
		const superCheckerUsers = users.filter((u) => u.isSuperChecker).length;
		const pendingApprovals = inbox.filter(
			(i) => i.processingResult === "awaiting.approval",
		).length;

		return {
			totalPermissions: permissions.length,
			enabledPermissions,
			totalUsers: users.length,
			superCheckerUsers,
			pendingApprovals,
		};
	} catch (error) {
		console.error("Failed to get maker checker impact:", error);
		return {
			totalPermissions: 0,
			enabledPermissions: 0,
			totalUsers: 0,
			superCheckerUsers: 0,
			pendingApprovals: 0,
		};
	}
}
