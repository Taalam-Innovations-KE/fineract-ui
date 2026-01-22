import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetRolesResponse,
	PutRolesRoleIdRequest,
} from "@/lib/fineract/generated/types.gen";

type RoleRouteContext = {
	params: Promise<{ roleId: string }>;
};

/**
 * GET /api/fineract/roles/:roleId
 * Fetch a role
 */
export async function GET(request: NextRequest, context: RoleRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { roleId } = await context.params;

		const role = await fineractFetch<GetRolesResponse>(
			`${FINERACT_ENDPOINTS.roles}/${roleId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(role);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/roles/:roleId
 * Update a role
 */
export async function PUT(request: NextRequest, context: RoleRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { roleId } = await context.params;
		const body = (await request.json()) as PutRolesRoleIdRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.roles}/${roleId}`,
			{
				method: "PUT",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
