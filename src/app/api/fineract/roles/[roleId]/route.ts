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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
