import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetRolesRoleIdPermissionsResponse,
	PutRolesRoleIdPermissionsRequest,
	PutRolesRoleIdPermissionsResponse,
} from "@/lib/fineract/generated/types.gen";

type PermissionToggleEntry = {
	code?: unknown;
	selected?: unknown;
};

function toBooleanPermissionsMap(
	entries: Array<[string, unknown]>,
): Record<string, boolean> {
	const permissions: Record<string, boolean> = {};

	for (const [code, selected] of entries) {
		if (code.length > 0 && typeof selected === "boolean") {
			permissions[code] = selected;
		}
	}

	return permissions;
}

function normalizePermissionPayload(
	updates: unknown,
): PutRolesRoleIdPermissionsRequest {
	if (!updates || typeof updates !== "object") {
		return { permissions: {} };
	}

	if (
		"permissions" in updates &&
		typeof (updates as { permissions?: unknown }).permissions === "object" &&
		(updates as { permissions?: unknown }).permissions !== null
	) {
		const existing = (updates as { permissions: Record<string, unknown> })
			.permissions;
		const permissions = toBooleanPermissionsMap(Object.entries(existing));

		return { permissions };
	}

	if (Array.isArray(updates)) {
		if (updates.every((entry) => typeof entry === "string")) {
			const permissions = toBooleanPermissionsMap(
				(updates as string[]).map((code) => [code, true]),
			);
			return { permissions };
		}

		const permissions = toBooleanPermissionsMap(
			(updates as PermissionToggleEntry[]).map((entry) => [
				String(entry.code ?? ""),
				entry.selected,
			]),
		);
		return { permissions };
	}

	const record = updates as Record<string, unknown>;
	const permissions = toBooleanPermissionsMap(Object.entries(record));

	return { permissions };
}

/**
 * GET /api/fineract/roles/[roleId]/permissions
 * Fetches role permissions in Fineract's permissionUsageData shape.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { roleId } = await params;

		const response = await fineractFetch<GetRolesRoleIdPermissionsResponse>(
			FINERACT_ENDPOINTS.rolePermissions(roleId),
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(response);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/roles/[roleId]/permissions
 * Updates role permissions with code->boolean map payload.
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { roleId } = await params;
		const updates = (await request.json()) as unknown;
		const body = normalizePermissionPayload(updates);

		const response = await fineractFetch<PutRolesRoleIdPermissionsResponse>(
			FINERACT_ENDPOINTS.rolePermissions(roleId),
			{
				method: "PUT",
				body,
				tenantId,
			},
		);

		return NextResponse.json(response ?? {});
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
