import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetUsersResponse,
	PutUsersUserIdRequest,
} from "@/lib/fineract/generated/types.gen";

type UserRouteContext = {
	params: Promise<{ userId: string }>;
};

/**
 * GET /api/fineract/users/:userId
 * Fetch a single user
 */
export async function GET(request: NextRequest, context: UserRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { userId } = await context.params;

		const user = await fineractFetch<GetUsersResponse>(
			`${FINERACT_ENDPOINTS.users}/${userId}`,
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
 * PUT /api/fineract/users/:userId
 * Update a user
 */
export async function PUT(request: NextRequest, context: UserRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { userId } = await context.params;
		const body = (await request.json()) as PutUsersUserIdRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.users}/${userId}`,
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
