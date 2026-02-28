import { NextRequest, NextResponse } from "next/server";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetReportsResponse,
	GetRolesRoleIdPermissionsResponse,
	PutRolesRoleIdPermissionsRequest,
	PutRolesRoleIdPermissionsResponse,
} from "@/lib/fineract/generated/types.gen";
import {
	discoverTablePentahoPairs,
	normalizeReportName,
	STRICT_REPORT_PERMISSION_CODES,
	type TablePentahoPair,
	toReportCatalogItems,
	toReportReadPermissionCode,
} from "@/lib/fineract/report-pairing";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface PentahoEnforcementRequestBody {
	roleIds?: unknown;
	strictEnforcement?: unknown;
	verifyRunReports?: unknown;
	verificationPairsLimit?: unknown;
}

interface ReportPairSummary {
	baseName: string;
	tableReportId: number | null;
	tableReportName: string;
	tableUseReport: boolean;
	tableCoreReport: boolean;
	pentahoReportId: number | null;
	pentahoReportName: string;
	pentahoUseReport: boolean;
	pentahoCoreReport: boolean;
}

type TableDisableStatus =
	| "disabled"
	| "already-disabled"
	| "skipped-no-id"
	| "failed";

interface TableDisableResult {
	reportId: number | null;
	reportName: string;
	pentahoReportName: string;
	status: TableDisableStatus;
	error?: string;
}

type RoleUpdateStatus = "updated" | "no-matching-permissions" | "failed";

interface RoleUpdateResult {
	roleId: number;
	status: RoleUpdateStatus;
	updatedPermissionCodes: string[];
	skippedPermissionCodes: string[];
	error?: string;
}

type RunReportVerificationOutcome = "passed" | "failed" | "indeterminate";
type RunReportExpectation = "denied" | "allowed";
type RunReportVariant = "table" | "pentaho";

interface RunReportVerificationEntry {
	variant: RunReportVariant;
	reportName: string;
	expectation: RunReportExpectation;
	outcome: RunReportVerificationOutcome;
	httpStatus: number | null;
	message: string;
}

interface PairRunReportVerification {
	baseName: string;
	entries: RunReportVerificationEntry[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}

	const record = asRecord(error);
	if (!record) {
		return "Unexpected error";
	}

	if (typeof record.message === "string" && record.message.trim()) {
		return record.message.trim();
	}

	if (typeof record.code === "string" && record.code.trim()) {
		return record.code.trim();
	}

	return "Unexpected error";
}

function toErrorStatus(error: unknown): number | null {
	const record = asRecord(error);
	if (!record) {
		return null;
	}

	const fromHttpStatus = record.httpStatus;
	if (
		typeof fromHttpStatus === "number" &&
		Number.isFinite(fromHttpStatus) &&
		fromHttpStatus > 0
	) {
		return fromHttpStatus;
	}

	const fromStatus = record.status;
	if (
		typeof fromStatus === "number" &&
		Number.isFinite(fromStatus) &&
		fromStatus > 0
	) {
		return fromStatus;
	}

	return null;
}

function toBoolean(value: unknown, fallback = false): boolean {
	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") {
			return true;
		}
		if (normalized === "false") {
			return false;
		}
	}

	return fallback;
}

function toRoleIds(value: unknown): number[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const parsed: number[] = [];
	const seen = new Set<number>();

	for (const item of value) {
		const raw =
			typeof item === "number"
				? item
				: typeof item === "string"
					? Number(item)
					: Number.NaN;
		if (!Number.isInteger(raw) || raw <= 0 || seen.has(raw)) {
			continue;
		}
		seen.add(raw);
		parsed.push(raw);
	}

	return parsed;
}

function toVerificationPairsLimit(value: unknown): number | null {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}

	return Math.floor(parsed);
}

function toReportId(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}
	return null;
}

function toPairSummary(pair: TablePentahoPair): ReportPairSummary {
	return {
		baseName: pair.baseName,
		tableReportId: toReportId(pair.tableReport.id),
		tableReportName: normalizeReportName(pair.tableReport.reportName),
		tableUseReport: pair.tableReport.useReport !== false,
		tableCoreReport: pair.tableReport.coreReport === true,
		pentahoReportId: toReportId(pair.pentahoReport.id),
		pentahoReportName: normalizeReportName(pair.pentahoReport.reportName),
		pentahoUseReport: pair.pentahoReport.useReport !== false,
		pentahoCoreReport: pair.pentahoReport.coreReport === true,
	};
}

function toPermissionCodeSet(
	response: GetRolesRoleIdPermissionsResponse,
): Set<string> {
	const codes = new Set<string>();
	for (const permission of response.permissionUsageData || []) {
		const code = String(permission.code ?? "").trim();
		if (code) {
			codes.add(code);
		}
	}
	return codes;
}

function buildRolePermissionUpdateMap(
	availablePermissionCodes: Set<string>,
	pairs: TablePentahoPair[],
	strictEnforcement: boolean,
): {
	updates: Record<string, boolean>;
	updatedPermissionCodes: string[];
	skippedPermissionCodes: string[];
} {
	const requested = new Map<string, boolean>();

	for (const pair of pairs) {
		const tableReadCode = toReportReadPermissionCode(
			pair.tableReport.reportName,
		);
		if (tableReadCode) {
			requested.set(tableReadCode, false);
		}

		const pentahoReadCode = toReportReadPermissionCode(
			pair.pentahoReport.reportName,
		);
		if (pentahoReadCode) {
			requested.set(pentahoReadCode, true);
		}
	}

	if (strictEnforcement) {
		for (const strictCode of STRICT_REPORT_PERMISSION_CODES) {
			requested.set(strictCode, false);
		}
	}

	const updates: Record<string, boolean> = {};
	const updatedPermissionCodes: string[] = [];
	const skippedPermissionCodes: string[] = [];

	for (const [permissionCode, selected] of requested.entries()) {
		if (availablePermissionCodes.has(permissionCode)) {
			updates[permissionCode] = selected;
			updatedPermissionCodes.push(permissionCode);
		} else {
			skippedPermissionCodes.push(permissionCode);
		}
	}

	updatedPermissionCodes.sort((a, b) => a.localeCompare(b));
	skippedPermissionCodes.sort((a, b) => a.localeCompare(b));

	return {
		updates,
		updatedPermissionCodes,
		skippedPermissionCodes,
	};
}

async function disableTableReports(
	tenantId: string,
	pairs: TablePentahoPair[],
): Promise<TableDisableResult[]> {
	const results: TableDisableResult[] = [];
	const seenTableKeys = new Set<string>();

	for (const pair of pairs) {
		const tableReportName = normalizeReportName(pair.tableReport.reportName);
		const pentahoReportName = normalizeReportName(
			pair.pentahoReport.reportName,
		);
		const tableReportId = toReportId(pair.tableReport.id);
		const dedupeKey =
			tableReportId === null
				? `name:${tableReportName}`
				: `id:${tableReportId.toString()}`;

		if (seenTableKeys.has(dedupeKey)) {
			continue;
		}
		seenTableKeys.add(dedupeKey);

		if (tableReportId === null) {
			results.push({
				reportId: null,
				reportName: tableReportName,
				pentahoReportName,
				status: "skipped-no-id",
				error: "Report has no numeric id.",
			});
			continue;
		}

		if (pair.tableReport.useReport === false) {
			results.push({
				reportId: tableReportId,
				reportName: tableReportName,
				pentahoReportName,
				status: "already-disabled",
			});
			continue;
		}

		try {
			await fineractFetch(FINERACT_ENDPOINTS.reportById(tableReportId), {
				method: "PUT",
				body: { useReport: false },
				tenantId,
			});
			results.push({
				reportId: tableReportId,
				reportName: tableReportName,
				pentahoReportName,
				status: "disabled",
			});
		} catch (error) {
			results.push({
				reportId: tableReportId,
				reportName: tableReportName,
				pentahoReportName,
				status: "failed",
				error: toErrorMessage(error),
			});
		}
	}

	return results;
}

async function updateRolePermissions(
	tenantId: string,
	roleId: number,
	pairs: TablePentahoPair[],
	strictEnforcement: boolean,
): Promise<RoleUpdateResult> {
	try {
		const rolePermissions =
			await fineractFetch<GetRolesRoleIdPermissionsResponse>(
				FINERACT_ENDPOINTS.rolePermissions(roleId),
				{
					method: "GET",
					tenantId,
				},
			);

		const availablePermissionCodes = toPermissionCodeSet(rolePermissions);
		const { updates, updatedPermissionCodes, skippedPermissionCodes } =
			buildRolePermissionUpdateMap(
				availablePermissionCodes,
				pairs,
				strictEnforcement,
			);

		if (updatedPermissionCodes.length === 0) {
			return {
				roleId,
				status: "no-matching-permissions",
				updatedPermissionCodes,
				skippedPermissionCodes,
			};
		}

		const payload: PutRolesRoleIdPermissionsRequest = { permissions: updates };
		await fineractFetch<PutRolesRoleIdPermissionsResponse>(
			FINERACT_ENDPOINTS.rolePermissions(roleId),
			{
				method: "PUT",
				body: payload,
				tenantId,
			},
		);

		return {
			roleId,
			status: "updated",
			updatedPermissionCodes,
			skippedPermissionCodes,
		};
	} catch (error) {
		return {
			roleId,
			status: "failed",
			updatedPermissionCodes: [],
			skippedPermissionCodes: [],
			error: toErrorMessage(error),
		};
	}
}

async function verifyRunReportAccess(
	tenantId: string,
	reportName: string,
	expectation: RunReportExpectation,
	variant: RunReportVariant,
): Promise<RunReportVerificationEntry> {
	try {
		await fineractFetch(FINERACT_ENDPOINTS.runReports(reportName), {
			method: "GET",
			tenantId,
		});
		return {
			variant,
			reportName,
			expectation,
			outcome: expectation === "allowed" ? "passed" : "failed",
			httpStatus: 200,
			message:
				expectation === "allowed"
					? "Report executed successfully."
					: "Report executed successfully but expected permission denial.",
		};
	} catch (error) {
		const httpStatus = toErrorStatus(error);
		if (httpStatus === 401 || httpStatus === 403) {
			return {
				variant,
				reportName,
				expectation,
				outcome: expectation === "denied" ? "passed" : "failed",
				httpStatus,
				message:
					expectation === "denied"
						? "Permission denied as expected."
						: "Permission denied but report was expected to run.",
			};
		}

		return {
			variant,
			reportName,
			expectation,
			outcome: "indeterminate",
			httpStatus,
			message: toErrorMessage(error),
		};
	}
}

/**
 * GET /api/fineract/reports/pentaho-enforcement
 * Discovers report pairs where both Table and Pentaho variants exist.
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const reports = await fineractFetch<GetReportsResponse[]>(
			FINERACT_ENDPOINTS.reports,
			{
				method: "GET",
				tenantId,
			},
		);
		const pairs = discoverTablePentahoPairs(toReportCatalogItems(reports));
		const pairSummaries = pairs.map(toPairSummary);

		return NextResponse.json({
			summary: {
				totalReports: reports.length,
				pairCount: pairSummaries.length,
				tableReportCount: pairSummaries.length,
				alreadyDisabledTableCount: pairSummaries.filter(
					(pair) => !pair.tableUseReport,
				).length,
			},
			pairs: pairSummaries,
		});
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/reports/pentaho-enforcement
 * Runs API-only enforcement:
 * 1) discover table/pentaho report pairs,
 * 2) disable table variants in report catalog,
 * 3) update role permissions for each role.
 *
 * Optional: verify runreports permissions with best-effort checks.
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const payload = (await request.json().catch(() => ({}))) as
			| PentahoEnforcementRequestBody
			| undefined;
		const roleIds = toRoleIds(payload?.roleIds);

		if (roleIds.length === 0) {
			return invalidRequestResponse(
				"Body must include a non-empty roleIds array of numeric ids.",
			);
		}

		const strictEnforcement = toBoolean(payload?.strictEnforcement, false);
		const verifyRunReports = toBoolean(payload?.verifyRunReports, false);
		const verificationPairsLimitInput = toVerificationPairsLimit(
			payload?.verificationPairsLimit,
		);

		const reports = await fineractFetch<GetReportsResponse[]>(
			FINERACT_ENDPOINTS.reports,
			{
				method: "GET",
				tenantId,
			},
		);
		const pairs = discoverTablePentahoPairs(toReportCatalogItems(reports));
		const pairSummaries = pairs.map(toPairSummary);

		const tableDisableResults = await disableTableReports(tenantId, pairs);

		const roleUpdateResults: RoleUpdateResult[] = [];
		for (const roleId of roleIds) {
			roleUpdateResults.push(
				await updateRolePermissions(tenantId, roleId, pairs, strictEnforcement),
			);
		}

		const verificationLimit = verificationPairsLimitInput
			? Math.min(verificationPairsLimitInput, pairs.length)
			: pairs.length;
		const verificationPairs = pairs.slice(0, verificationLimit);
		const runReportVerifications: PairRunReportVerification[] = [];

		if (verifyRunReports) {
			for (const pair of verificationPairs) {
				const tableReportName = normalizeReportName(
					pair.tableReport.reportName,
				);
				const pentahoReportName = normalizeReportName(
					pair.pentahoReport.reportName,
				);

				const entries: RunReportVerificationEntry[] = [];

				if (tableReportName) {
					entries.push(
						await verifyRunReportAccess(
							tenantId,
							tableReportName,
							"denied",
							"table",
						),
					);
				}

				if (pentahoReportName) {
					entries.push(
						await verifyRunReportAccess(
							tenantId,
							pentahoReportName,
							"allowed",
							"pentaho",
						),
					);
				}

				runReportVerifications.push({
					baseName: pair.baseName,
					entries,
				});
			}
		}

		return NextResponse.json({
			summary: {
				totalReports: reports.length,
				pairCount: pairSummaries.length,
				roleCount: roleIds.length,
				strictEnforcement,
				verifyRunReports,
				disabledTableCount: tableDisableResults.filter(
					(result) => result.status === "disabled",
				).length,
				alreadyDisabledTableCount: tableDisableResults.filter(
					(result) => result.status === "already-disabled",
				).length,
				failedTableDisableCount: tableDisableResults.filter(
					(result) => result.status === "failed",
				).length,
				updatedRoleCount: roleUpdateResults.filter(
					(result) => result.status === "updated",
				).length,
				failedRoleCount: roleUpdateResults.filter(
					(result) => result.status === "failed",
				).length,
				roleNoMatchCount: roleUpdateResults.filter(
					(result) => result.status === "no-matching-permissions",
				).length,
				verificationPairCount: verifyRunReports
					? runReportVerifications.length
					: 0,
			},
			pairs: pairSummaries,
			tableDisableResults,
			roleUpdateResults,
			runReportVerifications,
			notes: verifyRunReports
				? [
						"Run-report verification is best-effort and executes using the caller's current credentials.",
						"Non-auth errors (for example missing report parameters) are returned as indeterminate.",
					]
				: [],
		});
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
