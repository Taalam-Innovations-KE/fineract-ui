import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	PostRolesRequest,
	PutRolesRoleIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/roles
 * Fetches all roles
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const roles = await fineractFetch<GetRolesResponse[]>(
			FINERACT_ENDPOINTS.roles,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(roles);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/roles
 * Creates a new role
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body: PostRolesRequest = await request.json();

		const role = await fineractFetch<GetRolesResponse>(
			FINERACT_ENDPOINTS.roles,
			{
				method: "POST",
				body,
				tenantId,
			},
		);

		return NextResponse.json(role, { status: 201 });
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
