import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetUsersUserIdResponse,
	PutUsersUserIdRequest,
	PutUsersUserIdResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/users/[id]
 * Fetches a single user by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		const user = await fineractFetch<GetUsersUserIdResponse>(
			`${FINERACT_ENDPOINTS.users}/${id}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(user);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/users/[id]
 * Updates a user by ID
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;
		const body = (await request.json()) as PutUsersUserIdRequest;

		const result = await fineractFetch<PutUsersUserIdResponse>(
			`${FINERACT_ENDPOINTS.users}/${id}`,
			{
				method: "PUT",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result ?? {});
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * DELETE /api/fineract/users/[id]
 * Deletes a user by ID
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		await fineractFetch(`${FINERACT_ENDPOINTS.users}/${id}`, {
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
