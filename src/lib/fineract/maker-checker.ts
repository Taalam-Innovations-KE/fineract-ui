"use server";

import { fineractFetch } from "./client.server";
import type {
	AppUser,
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
	makerId?: number;
	makerName?: string;
	checkerId?: number;
	checkerName?: string;
	madeOnDate?: string;
	checkedOnDate?: string;
	processingResult: string;
	resourceId?: string;
	entityName?: string;
	actionName?: string;
	officeName?: string;
	clientName?: string;
	groupName?: string;
	loanAccountNo?: string;
	savingsAccountNo?: string;
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

export interface MakerCheckerSearchTemplate {
	actionNames: string[];
	entityNames: string[];
	appUsers: Array<{ id: number; username: string }>;
}

export interface MakerCheckerInboxParams {
	actionName?: string;
	entityName?: string;
	resourceId?: number;
	makerId?: number;
	makerDateTimeFrom?: string;
	makerDateTimeTo?: string;
	officeId?: number;
	clientId?: number;
	loanId?: number;
	groupId?: number;
	savingsAccountId?: number;
	includeJson?: boolean;
	offset?: number;
	limit?: number;
	orderBy?: string;
	sortOrder?: "ASC" | "DESC";
	paged?: boolean;
}

function normalizeString(value: unknown): string | undefined {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
	if (typeof value === "number") {
		return String(value);
	}
	return undefined;
}

function normalizeNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function normalizeEntry(item: unknown): MakerCheckerEntry {
	const obj = item as Record<string, unknown>;

	return {
		auditId: normalizeNumber(obj.auditId) ?? 0,
		makerId: normalizeNumber(obj.makerId ?? obj.maker),
		makerName: normalizeString(obj.makerName),
		checkerId: normalizeNumber(obj.checkerId ?? obj.checker),
		checkerName: normalizeString(obj.checkerName),
		madeOnDate: normalizeString(obj.madeOnDate),
		checkedOnDate: normalizeString(obj.checkedOnDate),
		processingResult: normalizeString(obj.processingResult) ?? "unknown",
		resourceId: normalizeString(obj.resourceId),
		entityName: normalizeString(obj.entityName),
		actionName: normalizeString(obj.actionName),
		officeName: normalizeString(obj.officeName),
		clientName: normalizeString(obj.clientName),
		groupName: normalizeString(obj.groupName),
		loanAccountNo: normalizeString(obj.loanAccountNo),
		savingsAccountNo: normalizeString(obj.savingsAccountNo),
		commandAsJson: normalizeString(obj.commandAsJson),
	};
}

function isAwaitingApproval(result: string | undefined): boolean {
	if (!result) return false;
	return result.toLowerCase() === "awaiting.approval";
}

function buildMakerCheckerQuery(params?: MakerCheckerInboxParams): string {
	const query = new URLSearchParams();

	if (params?.actionName) query.set("actionName", params.actionName);
	if (params?.entityName) query.set("entityName", params.entityName);
	if (typeof params?.resourceId === "number")
		query.set("resourceId", String(params.resourceId));
	if (typeof params?.makerId === "number")
		query.set("makerId", String(params.makerId));
	if (params?.makerDateTimeFrom)
		query.set("makerDateTimeFrom", params.makerDateTimeFrom);
	if (params?.makerDateTimeTo)
		query.set("makerDateTimeTo", params.makerDateTimeTo);
	if (typeof params?.officeId === "number")
		query.set("officeId", String(params.officeId));
	if (typeof params?.clientId === "number")
		query.set("clientId", String(params.clientId));
	if (typeof params?.loanId === "number")
		query.set("loanid", String(params.loanId));
	if (typeof params?.groupId === "number")
		query.set("groupId", String(params.groupId));
	if (typeof params?.savingsAccountId === "number")
		query.set("savingsAccountId", String(params.savingsAccountId));
	if (params?.includeJson) query.set("includeJson", "true");
	if (typeof params?.offset === "number")
		query.set("offset", String(params.offset));
	if (typeof params?.limit === "number")
		query.set("limit", String(params.limit));
	if (params?.orderBy) query.set("orderBy", params.orderBy);
	if (params?.sortOrder) query.set("sortOrder", params.sortOrder);
	if (typeof params?.paged === "boolean")
		query.set("paged", String(params.paged));

	return query.toString();
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
		body: { enabled },
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
		code: String(p.code ?? ""),
		grouping: String(p.grouping ?? ""),
		selected: p.selected || false,
	}));
}

/**
 * Get maker checker inbox
 */
export async function getInbox(
	params?: MakerCheckerInboxParams,
): Promise<MakerCheckerEntry[]> {
	const queryString = buildMakerCheckerQuery(params);
	const path = queryString
		? `/v1/makercheckers?${queryString}`
		: "/v1/makercheckers";
	const response = await fineractFetch<unknown>(path, { method: "GET" });

	if (Array.isArray(response)) {
		return response
			.map((item) => normalizeEntry(item))
			.filter((item) => item.auditId);
	}

	if (!response || typeof response !== "object") {
		return [];
	}

	const payload = response as {
		pageItems?: unknown[];
		events?: unknown[];
	};
	const pageItems = Array.isArray(payload.pageItems)
		? payload.pageItems
		: Array.isArray(payload.events)
			? payload.events
			: [];

	return pageItems
		.map((item) => normalizeEntry(item))
		.filter((item) => item.auditId);
}

/**
 * Approve or reject a maker checker entry
 */
export async function approveRejectEntry(
	auditId: number,
	command: "approve" | "reject",
): Promise<void> {
	await fineractFetch(`/v1/makercheckers/${auditId}?command=${command}`, {
		method: "POST",
	});
}

/**
 * Delete maker checker entry (used for maker withdraw/cancel)
 */
export async function deleteMakerCheckerEntry(auditId: number): Promise<void> {
	await fineractFetch(`/v1/makercheckers/${auditId}`, {
		method: "DELETE",
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

export async function findUserByUsername(
	username: string | undefined,
): Promise<SuperCheckerUser | null> {
	if (!username) {
		return null;
	}
	const users = await getUsersForSuperChecker();
	return users.find((user) => user.username === username) || null;
}

/**
 * Filter inbox entries based on user's checker permissions
 */
export async function getFilteredInbox(
	userId?: number,
	params?: MakerCheckerInboxParams,
): Promise<MakerCheckerEntry[]> {
	const [inbox, searchTemplate] = await Promise.all([
		getInbox(params),
		getMakerCheckerSearchTemplate(),
	]);

	// If user is a super checker, show all entries
	const users = await getUsersForSuperChecker();
	const user = users.find((u) => u.id === userId);
	if (user?.isSuperChecker) {
		return inbox;
	}

	// Filter based on checker permissions
	return inbox.filter((entry) => {
		if (!entry.entityName) {
			return false;
		}
		return searchTemplate.entityNames.includes(entry.entityName);
	});
}

export function filterAwaitingInboxEntries(
	entries: MakerCheckerEntry[],
): MakerCheckerEntry[] {
	return entries.filter((entry) => isAwaitingApproval(entry.processingResult));
}

export function getMakerCheckerSummary(entries: MakerCheckerEntry[]) {
	const pending = entries.filter((entry) =>
		isAwaitingApproval(entry.processingResult),
	).length;
	const approved = entries.filter(
		(entry) => entry.processingResult.toLowerCase() === "approved",
	).length;
	const rejected = entries.filter(
		(entry) => entry.processingResult.toLowerCase() === "rejected",
	).length;

	return {
		total: entries.length,
		pending,
		approved,
		rejected,
	};
}

export function parseCommandAsJson(commandAsJson?: string): {
	actionName?: string;
	payload?: Record<string, unknown>;
} | null {
	if (!commandAsJson) {
		return null;
	}
	try {
		const parsed = JSON.parse(commandAsJson) as Record<string, unknown>;
		return {
			actionName: normalizeString(parsed.actionName),
			payload: parsed,
		};
	} catch {
		return null;
	}
}

export function matchesMakerCheckerQuery(
	entry: MakerCheckerEntry,
	query: string,
): boolean {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return true;

	const haystack = [
		entry.auditId ? String(entry.auditId) : "",
		entry.entityName ?? "",
		entry.actionName ?? "",
		entry.resourceId ?? "",
		entry.processingResult ?? "",
		entry.makerName ?? "",
		entry.checkerName ?? "",
		entry.officeName ?? "",
		entry.clientName ?? "",
	]
		.join(" ")
		.toLowerCase();

	return haystack.includes(normalizedQuery);
}

export function sortMakerCheckerEntries(
	entries: MakerCheckerEntry[],
): MakerCheckerEntry[] {
	return [...entries].sort((a, b) => {
		const aTime = a.madeOnDate ? new Date(a.madeOnDate).getTime() : 0;
		const bTime = b.madeOnDate ? new Date(b.madeOnDate).getTime() : 0;
		return bTime - aTime;
	});
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
		if (!entry.entityName) return false;
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
			getInbox({ includeJson: false }),
		]);

		const enabledPermissions = permissions.filter((p) => p.selected).length;
		const superCheckerUsers = users.filter((u) => u.isSuperChecker).length;
		const pendingApprovals = inbox.filter((i) =>
			isAwaitingApproval(i.processingResult),
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
