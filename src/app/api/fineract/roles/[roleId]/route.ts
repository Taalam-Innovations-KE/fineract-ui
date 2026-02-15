import { NextRequest, NextResponse } from "next/server";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	PutRolesRoleIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/roles/[roleId]
 * Fetches a single role by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { roleId } = await params;

		const role = await fineractFetch<GetRolesResponse>(
			`${FINERACT_ENDPOINTS.roles}/${roleId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(role);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/roles/[roleId]
 * Updates an existing role
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { roleId } = await params;
		const body: PutRolesRoleIdRequest = await request.json();

		const role = await fineractFetch<GetRolesResponse>(
			`${FINERACT_ENDPOINTS.roles}/${roleId}`,
			{
				method: "PUT",
				body,
				tenantId,
			},
		);

		return NextResponse.json(role);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/roles/[roleId]?command=enable|disable
 * Enables or disables a role
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { roleId } = await params;
		const command = request.nextUrl.searchParams.get("command");

		if (command !== "enable" && command !== "disable") {
			return invalidRequestResponse(
				"Query parameter 'command' must be 'enable' or 'disable'.",
			);
		}

		const response = await fineractFetch<unknown>(
			`${FINERACT_ENDPOINTS.roles}/${roleId}?command=${command}`,
			{
				method: "POST",
				tenantId,
			},
		);

		return NextResponse.json(response ?? { success: true, command });
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * DELETE /api/fineract/roles/[roleId]
 * Deletes a role
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { roleId } = await params;

		await fineractFetch(`${FINERACT_ENDPOINTS.roles}/${roleId}`, {
			method: "DELETE",
			tenantId,
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
